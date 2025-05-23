const throwMessage = require('./utils/throwMessage');
const { showTree } = require('./utils/treeTools');

const tree = [{ left: 1, right: 2, depth: 0, name: 'root', parent: null }];

module.exports = {
  _isDescendent,
  getChildren,
  getParents,
  nodeByName,
  removeNode,
  moveNode,
  addNode,
  moveRandomNode,
  getAllNodes,
  getQuery,
  getDeleted
};

/**
 * return nodes
 */
async function getAllNodes () {
  return tree;
}

/**
 * return nodes
 */
async function getDeleted () {
  // not implemented
  return [];
}

async function getQuery (parent, excluded) {
  return 'Not implemented in treeArray';
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
  return tree.filter(n =>
    n.left > node.left &&
    n.right < node.right &&
    n.depth <= baseDepth
  );
}

/**
 * Get parents
 */
async function getParents (name) {
  const node = await nodeByName(name, 'name');
  return tree.filter(n =>
    n.left < node.left && n.right > node.right
  );
}

/**
 * Get a node by its name
 * @param {string} name
 * @param {string} key - the key to display in case of error.
 * @returns {}
 */
async function nodeByName (name, key) {
  if (name == null) throwMessage(`${key} is missing`);
  const node = tree.find((n) => n.name === name);
  if (node == null) throwMessage(`${key} => node "${name}" does not exists`);
  return node;
}

/**
 * Move a node
 */
async function moveNode (node, destination) {
  console.log(`**** Move ${node.name} ${destination.name}`);
  // check if destination is descendent of node
  if (_isDescendent(destination, node)) throwMessage(`"${destination.name}" is a descendant of ${node.name}`);
  if (destination === node) throwMessage('Destination is identical to node');

  const leftOfMovingNode = node.left;
  const rightOfMovingNode = node.right;
  const sizeOfMovingNode = rightOfMovingNode - leftOfMovingNode + 1;
  const rightOfDestinationNode = destination.right;
  const leftOfDestinationNode = destination.left;
  // Upper in the chain & not a child
  const up = (leftOfDestinationNode < leftOfMovingNode && rightOfMovingNode > rightOfDestinationNode) ? 1 : -1;

  // set parent to future parent
  node.parent = destination.name;

  // hide the node by setting negative values
  for (const n of tree) {
    if (n.left >= leftOfMovingNode && n.right <= rightOfMovingNode) {
      change(n, 'left', -n.left);
      change(n, 'right', -n.right);
    }
  }

  // move block
  for (const n of tree) {
    if (up < 0) {
      if (n.left > rightOfMovingNode && n.left < rightOfDestinationNode) {
        change(n, 'left', n.left - sizeOfMovingNode);
      }
      // 'rm < right < rd --> right down'
      if (n.right > rightOfMovingNode && n.right < rightOfDestinationNode) {
        change(n, 'right', n.right - sizeOfMovingNode);
      }
    } else {
      if (n.left < rightOfMovingNode && n.left >= rightOfDestinationNode) {
        change(n, 'left', n.left + sizeOfMovingNode);
      }
      // 'rm < right && ed <= right --> right up'
      if (n.right < rightOfMovingNode && n.right >= rightOfDestinationNode) {
        change(n, 'right', n.right + sizeOfMovingNode);
      }
    }
  }

  tree.sort((a, b) => a.left - b.left);
  showTree(tree);

  // No delta shift as node already moved when down
  const deltaShift = (up < 1) ? -sizeOfMovingNode : 0;

  // shift node
  const deltaDepth = destination.depth - node.depth + 1;
  const shift = rightOfDestinationNode - leftOfMovingNode + deltaShift;
  for (const n of tree) {
    if (n.left < 0) {
      change(n, 'left', shift - n.left);
      change(n, 'right', shift - n.right);
      change(n, 'depth', deltaDepth + n.depth);
    }
  }

  tree.sort((a, b) => a.left - b.left);
  return `Moved ${node.name} to ${destination.name}`;
}

/**
 * Remove a node
 */
async function removeNode (name) {
  const found = await nodeByName(name, 'name');
  const node = structuredClone(found);
  const width = node.right - node.left + 1;

  // update tree left and right
  let i = 0;
  while (i < tree.length) {
    const n = tree[i];
    if (n.left >= node.left && n.right <= node.right) {
      tree.splice(i, 1); // remove all child nodes.
    } else {
      i++;
    }
  }
  // decrease left & right
  for (const n of tree) {
    if (n.left > node.right) change(n, 'left', n.left - width);
    if (n.right > node.right) change(n, 'right', n.right - width);
  }
  return `Removed ${name}`;
}

/**
 * Add a node
 * @param {string} name
 * @param {string} [parentName] - default "root"
 * @returns {string} message
 */
async function addNode (name, parentName = 'root') {
  if (name == null) throwMessage('name missing');
  const existing = tree.find((n) => n.name === name);
  if (existing) throwMessage(`node with name "${name}" already exists`);
  const parent = await nodeByName(parentName, 'parent-name');

  const parentCopy = structuredClone(parent);
  // update tree left and right
  for (const n of tree) {
    if (n.right >= parentCopy.right) change(n, 'right', n.right + 2);
    if (n.left > parentCopy.right) change(n, 'left', n.left + 2);
  }
  const node = { left: parentCopy.right, right: parentCopy.right + 1, depth: parent.depth + 1, name, parent: parentName };
  tree.push(node);
  // sort tree
  tree.sort((a, b) => a.left - b.left);
  return 'Added ' + name;
}

function change (node, key, value) {
  if (!node.changes) node.changes = [];
  node.changes.push([key, node[key], value]);
  node[key] = value;
}

async function moveRandomNode () {
  if (tree.length < 3) throwMessage('Tree is too small');
  let i = 0;
  while (i < 1) {
    const node = tree[Math.floor(Math.random() * tree.length)];
    const dest = tree[Math.floor(Math.random() * tree.length)];
    if (_isDescendent(dest, node) || (dest.name === node.name)) continue; // retry;
    i++;
    await moveNode(node, dest);
  }
}
