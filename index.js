const { registerCmd, startReadline } = require('./utils/myReadline');
const { showTree } = require('./utils/treeTools');

const baseTree = [
  ['a'], ['aa', 'a'], ['aaa', 'aa'], ['aaaa', 'aaa'], ['ab', 'a'], ['ac', 'a'],
  ['b'], ['ba', 'b'], ['bbb', 'ba'], ['bbbb', 'bbb'], ['bb', 'b'], ['bc', 'b'],
  ['c'], ['cc', 'c'], ['cb', 'c']
];

const tree = require('./treeArray');
// const tree = require('./treeSQLite');

// --------------- commands --------------- //

registerCmd('Show tree', '', 's', async () => {
  const nodes = await tree.getAllNodes();
  showTree(nodes);
});

registerCmd('Add a node', '<name> [parent]', '+', async (name, parentName = 'root') => {
  const res = tree.addNode(name, parentName);
  showTree(await tree.getAllNodes(), true);
  return res;
});

registerCmd('Remove a node', '<name>', '-', async (name) => {
  const res = tree.removeNode(name);
  showTree(await tree.getAllNodes());
  return res;
});

registerCmd('Move a node', '<name> <destination>', 'm', async (name, destinationName) => {
  const node = tree.nodeByName(name, 'name');
  const destination = tree.nodeByName(destinationName, 'destination');
  const res = tree.moveNode(node, destination);
  showTree(await tree.getAllNodes(), true);
  return res;
});

registerCmd('Get parents', '<name>', 'p', async (name) => {
  const res = tree.getParents(name);
  if (!Array.isArray(res)) return res;
  return `Parents of "${name}": ${res.join('/')}`;
});

registerCmd('Get childrens', '<name> [maxDepth]', 'c', async (name, maxDepth) => {
  const res = tree.getChildren(name, maxDepth || 0);
  if (!Array.isArray(res)) return res;
  return `Children of "${name}": ${res.join(', ')}`;
});

registerCmd('Load base tree', '', 'b', async function quit () {
  for (const a of baseTree) {
    const res = tree.addNode(a[0], a[1]);
    if (res.startsWith('Error')) console.log(res);
  }
  showTree(await tree.getAllNodes(), true);
  return 'Base tree loaded';
});

registerCmd('Random moves', '[moves = 100]', 'r', async (nMoves = 100) => {
  for (let i = 0; i < nMoves; i++) {
    try {
      tree.moveRandomNode();
    } catch (e) {
      console.log(`** Stopped after ${i}/${nMoves} random moves`);
      throw e;
    }
  }
  return `Executed ${nMoves} random moves`;
});

startReadline();
