const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const throwMessage = require('./utils/throwMessage');

module.exports = {
  _isDescendent,
  getQuery,
  getChildren,
  getParents,
  nodeByName,
  removeNode,
  moveNode,
  addNode,
  moveRandomNode,
  getAllNodes
};

const DB_OPTIONS = {};

const STORAGE_PATH = path.resolve(__dirname, './storage');
fs.mkdirSync(STORAGE_PATH, { recursive: true });

const db = new Database(path.resolve(STORAGE_PATH, 'db.sqlite'), DB_OPTIONS);
db.pragma('journal_mode = WAL');

// create table
db.prepare('CREATE TABLE IF NOT EXISTS tree (name TEXT PRIMARY KEY, parent TEXT, depth INTEGER NOT NULL, left INTEGER NOT NULL, right INTEGER NOT NULL, FOREIGN KEY (parent) REFERENCES tree(name));').run();
db.prepare('CREATE INDEX IF NOT EXISTS tree_depth ON tree(depth)').run();
db.prepare('CREATE INDEX IF NOT EXISTS tree_left ON tree(left)').run();
db.prepare('CREATE INDEX IF NOT EXISTS tree_right ON tree(right)').run();

// prepare statements
const statementInsertNode = db.prepare('INSERT INTO tree (name, parent, depth, left, right) VALUES (@name, @parent, @depth, @left, @right)');
const statementGetNode = db.prepare('SELECT * FROM tree WHERE name = ?');

// base queries
const statementGetChildren = db.prepare('SELECT * FROM tree WHERE left > @left AND right < @right AND depth <= @depth ORDER by left');
const statementGetParents = db.prepare('SELECT * FROM tree WHERE left < @left AND right > @right ORDER by left');

// statements & transaction add node
const statementInsertAdd2Right = db.prepare('UPDATE tree SET right = right + 2 WHERE right >= @parentRight');
const statementInsertAdd2Left = db.prepare('UPDATE tree SET left = left + 2 WHERE left > @parentRight');
const transactionAddRow = db.transaction((name, parent) => {
  statementInsertAdd2Right.run({ parentRight: parent.right });
  statementInsertAdd2Left.run({ parentRight: parent.right });
  statementInsertNode.run({ name, parent: parent.name, depth: parent.depth + 1, left: parent.right, right: parent.right + 1 });
});

// statements and transaction remove node
const statementDeleteNodeAndChilds = db.prepare('DELETE FROM tree WHERE left >= @left AND right <= @right');
const statementDecreaseLeftOfNodesBefore = db.prepare('UPDATE tree SET left = left - @width WHERE left > @nodeRight');
const statementDecreaseRightOfNodesBefore = db.prepare('UPDATE tree SET right = right - @width WHERE right > @nodeRight');
const transactionDeleteNodeAndChilds = db.transaction((node) => {
  const width = node.right - node.left + 1;
  statementDeleteNodeAndChilds.run({ left: node.left, right: node.right });
  statementDecreaseRightOfNodesBefore.run({ width, nodeRight: node.right });
  statementDecreaseLeftOfNodesBefore.run({ width, nodeRight: node.right });
});

// get all node
const statementGetNodes = db.prepare('SELECT * from tree ORDER BY left');

// ------------ move -------------------//
// hide the node by setting negative values
const statementMoveHideNodes = db.prepare('UPDATE tree SET left = -left, right = -right WHERE left >= @leftOfMovingNode AND right <= @rightOfMovingNode');
// shift down
const statementMoveShiftDownLeft = db.prepare('UPDATE tree SET left = left - @sizeOfMovingNode WHERE left > @rightOfMovingNode AND left < @rightOfDestinationNode');
const statementMoveShiftDownRight = db.prepare('UPDATE tree SET right = right - @sizeOfMovingNode WHERE right > @rightOfMovingNode AND right < @rightOfDestinationNode');
// shift up
const statementMoveShiftUpLeft = db.prepare('UPDATE tree SET left = left + @sizeOfMovingNode WHERE left < @rightOfMovingNode AND left >= @rightOfDestinationNode');
const statementMoveShiftUpRight = db.prepare('UPDATE tree SET right = right + @sizeOfMovingNode WHERE right < @rightOfMovingNode AND right >= @rightOfDestinationNode');
// replace hidden node, set parent and depth
const statementMoveHidenNodes = db.prepare('UPDATE tree SET left = @shift - left, right = @shift - right, depth = depth + @deltaDepth WHERE left < 0');
const statementUpdateParentName = db.prepare('UPDATE tree SET parent = @parentName WHERE name = @name');

const transactionMove = db.transaction((node, destination) => {
  const leftOfMovingNode = node.left;
  const rightOfMovingNode = node.right;
  const leftOfDestinationNode = destination.left;
  const rightOfDestinationNode = destination.right;
  const sizeOfMovingNode = rightOfMovingNode - leftOfMovingNode + 1;

  // Update the node first
  statementUpdateParentName.run({ name: node.name, parentName: destination.name });

  // Upper in the chain & not a child
  const up = (leftOfDestinationNode < leftOfMovingNode && rightOfMovingNode > rightOfDestinationNode) ? 1 : -1;
  statementMoveHideNodes.run({ leftOfMovingNode, rightOfMovingNode });
  if (up < 0) {
    statementMoveShiftDownLeft.run({ sizeOfMovingNode, rightOfMovingNode, rightOfDestinationNode });
    statementMoveShiftDownRight.run({ sizeOfMovingNode, rightOfMovingNode, rightOfDestinationNode });
  } else {
    statementMoveShiftUpLeft.run({ sizeOfMovingNode, rightOfMovingNode, rightOfDestinationNode });
    statementMoveShiftUpRight.run({ sizeOfMovingNode, rightOfMovingNode, rightOfDestinationNode });
  }
  // No delta shift as node already moved when down
  const deltaShift = (up < 1) ? -sizeOfMovingNode : 0;
  const deltaDepth = destination.depth - node.depth + 1;
  const shift = rightOfDestinationNode - leftOfMovingNode + deltaShift;

  statementMoveHidenNodes.run({ shift, deltaDepth });
});
// ------------------------------------//

// delete all at start
db.prepare('DELETE FROM tree').run();
statementInsertNode.run({ name: 'root', parent: null, depth: 0, left: 0, right: 2 });

async function getAllNodes () {
  const nodes = statementGetNodes.all();
  return nodes;
}

async function getQuery (parentName, excluded, depth = Infinity, onlyOne = false) {
  const wheres = [`parent.name = '${parentName}'`];

  if (depth !== Infinity) {
    wheres.push(`node.depth <= parent.depth + ${depth}`);
  }

  if (excluded && excluded.length > 0) {
    const excludedString = excluded.map(e => `'${e}'`).join(', ');
    wheres.push(`NOT EXISTS (SELECT 1 FROM tree AS excluded WHERE excluded.name IN (${excludedString}) AND node.left >= excluded.left AND node.right <= excluded.right)`);
  }

  const oneOrChildsStmnt = onlyOne ? 'ON node.left >= parent.left AND node.right <= parent.right' : 'ON node.left > parent.left AND node.right < parent.right';

  const stmt = 'SELECT node.* FROM tree AS parent JOIN tree AS node ' +
    oneOrChildsStmnt + ' WHERE ' + wheres.join(' AND ') + ' ORDER BY left';
  const statementGetQuery = db.prepare(stmt);
  const nodes = statementGetQuery.all();
  console.log(nodes);
  console.log(stmt);
  return nodes;
}

/**
 * Get a node by its name
 * @param {string} name
 * @param {string} key - the key to display in case of error.
 * @returns {}
 */
async function nodeByName (name, key) {
  if (name == null) throwMessage(`${key} is missing`);
  const node = statementGetNode.get(name);
  if (node == null) throwMessage(`${key} => node "${name}" does not exists`);
  return node;
}

/**
 * Add a node
 * @param {string} name
 * @param {string} [parentName] - default "root"
 * @returns {string} message
 */
async function addNode (name, parentName = 'root') {
  if (name == null) throwMessage('name missing');
  const existing = statementGetNode.get(name);
  if (existing) throwMessage(`node with name "${name}" already exists`);
  const parent = await nodeByName(parentName, 'parent-name');

  transactionAddRow(name, parent);
  return 'Added ' + name;
}

/**
 * Remove a node
 */
async function removeNode (name) {
  const found = await nodeByName(name, 'name');
  const node = structuredClone(found);
  transactionDeleteNodeAndChilds(node);
  return `Removed ${name}`;
}

/**
 * Check is a node is a decendent
 */
function _isDescendent (node, potentialParent) {
  return (node.left > potentialParent.left && node.right < potentialParent.right);
}

/**
 * Get children
 */
async function getChildren (name, maxDepth = 0) {
  if (name == null) throwMessage('name missing');
  const node = await nodeByName(name, 'name');
  const realMaxDepth = maxDepth > 0 ? maxDepth : Infinity;
  const baseDepth = node.depth + realMaxDepth;
  const children = statementGetChildren.all({ left: node.left, right: node.right, depth: baseDepth });
  return children;
}

/**
 * Get parents
 */
async function getParents (name) {
  const node = await nodeByName(name, 'name');
  const parents = statementGetParents.all({ left: node.left, right: node.right });
  return parents;
}

/**
 * Move a node
 */
async function moveNode (node, destination) {
  console.log(`**** Move ${node.name} ${destination.name}`);
  // check if destination is descendent of node
  if (_isDescendent(destination, node)) throwMessage(`"${destination.name}" is a descendant of ${node.name}`);
  if (destination === node) throwMessage('Destination is identical to node');
  transactionMove(node, destination);
  return `Moved ${node.name} to ${destination.name}`;
}

const statementGetTreeSize = db.prepare('SELECT count(*) AS count FROM tree');
const statementGetRadomRow = db.prepare('SELECT * FROM tree WHERE _ROWID_ >= (abs(random()) % (SELECT max(_ROWID_) FROM tree)) LIMIT 1');
async function moveRandomNode () {
  const treeSize = statementGetTreeSize.get();
  if (treeSize.count < 3) throwMessage('Tree is too small');
  let i = 0;
  while (i < 1) {
    const node = statementGetRadomRow.get();
    const dest = statementGetRadomRow.get();
    if (_isDescendent(dest, node) || (dest.name === node.name)) continue; // retry;
    i++;
    await moveNode(node, dest);
  }
}
