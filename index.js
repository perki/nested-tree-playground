const { registerCmd, startReadline } = require('./myReadline');

const tree = [{left: 1, right: 2, depth: 0, name: 'root', parent: null}];

const baseTree = [
  ['a'],['aa','a'],['aaa', 'aa'], ['aaaa','aaa'], ['ab', 'a'],['ac','a'],
  ['b'],['ba','b'],['bbb', 'ba'], ['bbbb','bbb'], ['bb', 'b'],['bc','b'],
  ['c'],['cc','c'],['cb', 'c']
];

// --------------- commands --------------- //

registerCmd('Show tree', ['s'], async () => {
  showTree();
});

registerCmd('Add a node <name> [parent]', ['+'], async (name, parentName = 'root') => {
  const res = addNode(name, parentName);
  showTree(true);
  return res;
});

registerCmd('Remove a node <name>', ['-'], async (name, parentName = 'root') => {
  const res = removeNode(name);
  showTree(true);
  return res;
});

registerCmd('Move a node <name> <destination>', ['m'], async (name, destination) => {
  const res = moveNode(name, destination);
  showTree(true);
  return res;
});

registerCmd('Get parents <name>', ['p'], async (name) => {
  const res = getParents(name);
  if (!Array.isArray(res)) return res;
  return `Parents of "${name}": ${res.join('/')}`;
});

registerCmd('Get childrens <name> [maxDepth]', ['c'], async (name, maxDepth) => {
  const res = getChildren(name, maxDepth || 0);
  if (!Array.isArray(res)) return res;
  return `Children of "${name}": ${res.join(', ')}`;
});

registerCmd('Load base tree', ['b'], async function quit () {
  for (const a of baseTree) {
    const res = addNode(a[0], a[1]);
    if (res.startsWith('Error')) console.log(res);
  }
  showTree(true);
  return 'Base tree loaded';
});

startReadline();


/**
 * Check is a node is a child
 */
function _isChild (node, potentialParent) {
  return (node.left > potentialParent.left && node.right < potentialParent.right);
}

/**
 * Get children
 */
function getChildren (name, maxDepth =  0) {
  if (name == null) return 'Error: name missing, usage: <name>';
  const node = tree.find((n) => n.name === name);
  if (node == null) return `Error: node with name "${name}" does not exists`;

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
  if (name == null) return 'Error: name missing, usage: <name>';
  const node = tree.find((n) => n.name === name);
  if (node == null) return `Error: node with name "${name}" does not exists`;
  return tree.filter(n =>
    n.left < node.left && n.right > node.right
  ).map((n) => n.name);
}

/**
 * Display tree
 */
function showTree(checkIsValid) {
  for (const n of tree) {
    const spacing = '                      '.substring(0,n.depth * 2);
    console.log(spacing + n.name + ' l:' + n.left + ' r:' + n.right, '\t p:' + n.parent);
  }
  if (checkIsValid) {
    console.log(isValidNestedSet())
  }
}


/**
 * Move a node
 */
function moveNode (name, destinationName) {
  if (name == null) return 'Error: name missing, usage: <name> <destination>';
  if (destinationName == null) return 'Error: parent-name missing, usage: <name> <destination>';
  const node = tree.find((n) => n.name === name);
  if (node == null) return `Error: node with name "${name}" does not exists`;
  const destination = tree.find((n) => n.name === destinationName);
  if (destination == null) return `Error: node with name "${destinationName}" does not exists`;

  // check if destination is children of node
  if (_isChild(destination, node)) {
    return `Error: "${destinationName}" is a child of ${name}`;
  }


  const leftOfMovingNode = node.left;
  const rightOfMovingNode = node.right;
  const sizeOfMovingNode = rightOfMovingNode - leftOfMovingNode + 1;
  const rightOfDestinationNode = destination.right;

  // set parent to future parent
  node.parent = destinationName;

  // hide the node by setting negative values
  for (const n of tree) {
    if (n.left >= leftOfMovingNode && n.right <= rightOfMovingNode) {
      n.left = -n.left;
      n.right = -n.right;
    }
  } 

  // close the gap 
  for (const n of tree) {
    if (n.left > rightOfMovingNode) n.left -= sizeOfMovingNode;
    if (n.right > rightOfMovingNode) n.right -= sizeOfMovingNode;
  } 

  // console.log('***** - Gap Closed')
  // tree.sort((a, b) => a.left - b.left);
  // showTree()

  // make room 
  for (const n of tree) {
    if (n.left >= rightOfDestinationNode) n.left += sizeOfMovingNode;
    if (n.right >= rightOfDestinationNode) n.right += sizeOfMovingNode;
  } 
  // console.log('***** - Room made', { rightOfDestinationNode, sizeOfMovingNode });
  // tree.sort((a, b) => a.left - b.left);
  // showTree()

  // shift node
  const deltaDepth = destination.depth - node.depth + 1;
  const shift = rightOfDestinationNode - leftOfMovingNode;
  for (const n of tree) {
    if (n.left < 0) {
      n.left = shift - n.left;
      n.right = shift - n.right;
      n.depth += deltaDepth;
      // console.log('shift', n, { shift, deltaDepth });
    }
  } 

  tree.sort((a, b) => a.left - b.left);
  return `Moved ${name} to ${destinationName}`
}

/**
 * Remove a node
 */
function removeNode (name) {
  if (name == null) return 'Error: name missing, usage a <name> [parent Name]';
  const found = tree.find((n) => n.name === name);
  if (found == null) return `Error: node with name "${name}" does not exists`;
  const node = structuredClone(found);
  const width = node.right - node.left + 1;

  // update tree left and right
  let i = 0;
  while (i < tree.length) {
    const n = tree[i];
    if (n.left >= node.left && n.right <= node.right) {
      tree.splice(i, 1);
    } else {
      i++;
    }
  }
  // decrease left & right
  for (const n of tree) {
    if (n.left > node.right) n.left -= width;
    if (n.right > node.right) n.right -= width;
  } 
  return `Removed ${name}`
}

/**
 * Add a node
 * @param {string} name 
 * @param {string} [parentName] - default "root"
 * @returns {string} message
 */
function addNode (name, parentName = 'root') {
  if (name == null) return 'Error: name missing, usage a <name> [parent Name]';
  const existing = tree.find((n) => n.name === name);
  if (existing) return `Error: node with name "${name}" already exists`;
  const parent = tree.find((n) => n.name === parentName);
  if (!parent) return `Error: cannot find parent with name "${parentName}"`;
  
  const parentCopy = structuredClone(parent);
  // update tree left and right
  for (const n of tree) {
    if (n.right >= parentCopy.right) n.right += 2;
    if (n.left > parentCopy.right) n.left += 2;
  }
  const node = {left: parentCopy.right, right: parentCopy.right + 1, depth: parent.depth + 1, name, parent: parentName};
  tree.push(node);
  // sort tree
  tree.sort((a, b) => a.left - b.left);
  return 'Added ' + name;
}


function isValidNestedSet() {
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
    errors.push("Left/right values are not unique");
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

  return errors.length ? errors : 'Tree is valid';
}