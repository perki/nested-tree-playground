const throwMessage = require('./throwMessage');

module.exports = {
  isValidTree,
  showTree,
  getTreeObject
};

function isValidTree (nodes, throwError = false) {
  const errors = [];

  // 1. Check that left < right for all nodes
  for (const node of nodes) {
    if (node.left >= node.right) {
      errors.push(`Node ${node.name} has invalid left/right values: (${node.left}, ${node.right})`);
    }
  }

  // 2. Check that left/right values are unique
  const allBounds = nodes.flatMap(node => [node.left, node.right]);
  const uniqueBounds = new Set(allBounds);
  if (uniqueBounds.size !== allBounds.length) {
    errors.push('Left/right values are not unique');
  }

  // 3. Check containment: each child must be fully nested in its parent
  const idToNode = Object.fromEntries(nodes.map(n => [n.name, n]));
  for (const node of nodes) {
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
  const maxRight = Math.max(...nodes.map(n => n.right));
  const expectedMax = nodes.length * 2;
  if (maxRight !== expectedMax) {
    errors.push(`Max right value ${maxRight} does not equal 2 * total nodes (${expectedMax})`);
  }

  // 5. Check depth are correct
  for (const node of nodes) {
    const computedDepth = nodes.filter(n =>
      n.left < node.left && n.right > node.right
    ).length;
    if (node.depth !== computedDepth) errors.push(`Node ${node.name} should have a depth of ${computedDepth} no ${node.depth}`);
  }

  if (throwError && errors.length) throwMessage('Tree not valid \n' + errors.join('\n- '));
  return errors.length ? errors : 'Tree is valid';
}

/**
 * Display tree and last changes
 */
function showTree (nodes, checkIsValid) {
  for (const n of nodes) {
    const spacing = '                      '.substring(0, n.depth * 2);
    const changes = n.changes ? n.changes.map((c) => `${c[0]} ${c[1]}=>${c[2]}`).join(', ') : '';
    console.log(spacing + n.name + ' l:' + n.left + ' r:' + n.right, '\tp:' + n.parent + '\t' + changes);
    n.changes = [];
  }
  if (checkIsValid) {
    console.log(isValidTree(nodes));
  }
}

/**
 * Display tree as object
 */
function getTreeObject (nodes) {
  const result = [];
  let previous = [];
  for (const n of nodes) {
    const node = { id: n.name, children: [] };
    while (previous.length > 0 && previous[previous.length - 1].id !== n.parent) { previous.pop(); }
    if (previous.length > 0) {
      previous[previous.length - 1].children.push(node);
    } else {
      result.push(node);
    }
    previous.push(node);
  }
  return result;
}