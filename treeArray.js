const throwMessage = require('./utils/throwMessage');

const tree = [{ left: 1, right: 2, depth: 0, name: 'root', parent: null }];

module.exports = {
  isDescendent,
  getChildren,
  getParents,
  showTree,
  nodeByName,
  removeNode,
  moveNode,
  isValidTree,
  addNode,
  moveRandomNode
};

/**
 * Check is a node is a decendent
 */
function isDescendent (node, potentialParent) {
  return (node.left > potentialParent.left && node.right < potentialParent.right);
}

/**
 * Get children
 */
function getChildren (name, maxDepth = 0) {
  if (name == null) throwMessage('name missing');
  const node = nodeByName(name, 'name');

  const realMaxDepth = maxDepth > 0 || Infinity;

  const baseDepth = node.depth;

  return tree.filter(n =>
    n.left > node.left &&
    n.right < node.right &&
    n.depth <= baseDepth + realMaxDepth
  ).map((n) => n.name);
}

/**
 * Get parents
 */
function getParents (name) {
  const node = nodeByName(name, 'name');
  return tree.filter(n =>
    n.left < node.left && n.right > node.right
  ).map((n) => n.name);
}

/**
 * Display tree and last changes
 */
function showTree (checkIsValid) {
  for (const n of tree) {
    const spacing = '                      '.substring(0, n.depth * 2);
    const changes = n.changes ? n.changes.map((c) => `${c[0]} ${c[1]}=>${c[2]}`).join(', ') : '';
    console.log(spacing + n.name + ' l:' + n.left + ' r:' + n.right, '\tp:' + n.parent + '\t' + changes);
    n.changes = [];
  }
  if (checkIsValid) {
    console.log(isValidTree());
  }
}

/**
 * Get a node by its name
 * @param {string} name
 * @param {string} key - the key to display in case of error.
 * @returns {}
 */
function nodeByName (name, key) {
  if (name == null) throwMessage(`${key} is missing`);
  const node = tree.find((n) => n.name === name);
  if (node == null) throwMessage(`${key} => node "${name}" does not exists`);
  return node;
}

/**
 * Move a node
 */
function moveNode (node, destination) {
  console.log(`**** Move ${node.name} ${destination.name}`);
  // check if destination is descendent of node
  if (isDescendent(destination, node)) throwMessage(`"${destination.name}" is a descendant of ${node.name}`);
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
  showTree();

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
function removeNode (name) {
  const found = nodeByName(name, 'name');
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
function addNode (name, parentName = 'root') {
  if (name == null) throwMessage('name missing');
  const existing = tree.find((n) => n.name === name);
  if (existing) throwMessage(`node with name "${name}" already exists`);
  const parent = nodeByName(parentName, 'parent-name');

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

/**
 * Check TREE
 */
function isValidTree (throwError = false) {
  const errors = [];

  // 1. Check that left < right for all nodes
  for (const node of tree) {
    if (node.left >= node.right) {
      errors.push(`Node ${node.name} has invalid left/right values: (${node.left}, ${node.right})`);
    }
  }

  // 2. Check that left/right values are unique
  const allBounds = tree.flatMap(node => [node.left, node.right]);
  const uniqueBounds = new Set(allBounds);
  if (uniqueBounds.size !== allBounds.length) {
    errors.push('Left/right values are not unique');
  }

  // 3. Check containment: each child must be fully nested in its parent
  const idToNode = Object.fromEntries(tree.map(n => [n.name, n]));
  for (const node of tree) {
    if (node.parent !== null) {
      const parent = idToNode[node.parent];
      if (!parent) {
        errors.push(`Parent ${node.parent} not found for node ${node.name}`);
      } else if (!(node.left > parent.left && node.right < parent.right)) {
        errors.push(`Node ${node.name} is not properly nested within parent ${parent.name}`);
      }
    }
  }

  // 4. Check that max right equals 2 * number of nodes
  const maxRight = Math.max(...tree.map(n => n.right));
  const expectedMax = tree.length * 2;
  if (maxRight !== expectedMax) {
    errors.push(`Max right value ${maxRight} does not equal 2 * total nodes (${expectedMax})`);
  }

  // 5. Check depth are correct
  for (const node of tree) {
    const computedDepth = tree.filter(n =>
      n.left < node.left && n.right > node.right
    ).length;
    if (node.depth !== computedDepth) errors.push(`Node ${node.name} should have a depth of ${computedDepth} no ${node.depth}`);
  }

  if (throwError && errors.length) throwMessage('Tree not valid \n' + errors.join('\n- '));
  return errors.length ? errors : 'Tree is valid';
}

function change (node, key, value) {
  if (!node.changes) node.changes = [];
  node.changes.push([key, node[key], value]);
  node[key] = value;
}

function moveRandomNode () {
  if (tree.length === 1) throwMessage('Tree is empty');
  let i = 0;
  while (i < 1) {
    const node = tree[Math.floor(Math.random() * tree.length)];
    const dest = tree[Math.floor(Math.random() * tree.length)];
    if (isDescendent(dest, node) || (dest === node)) continue; // retry;
    i++;
    moveNode(node, dest);
    isValidTree(true);
  }
}
