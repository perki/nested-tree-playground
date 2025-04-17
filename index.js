const { registerCmd, startReadline, question } = require('./utils/myReadline');
const { showTree, isValidTree, getTreeObject } = require('./utils/treeTools');

const baseTree = [
  ['a'], ['aa', 'a'], ['aaa', 'aa'], ['aaaa', 'aaa'], ['ab', 'a'], ['ac', 'a'],
  ['b'], ['ba', 'b'], ['bbb', 'ba'], ['bbbb', 'bbb'], ['bb', 'b'], ['bc', 'b'],
  ['c'], ['cc', 'c'], ['cb', 'c']
];

let tree = null;

const trees = [
  { name: 'Array', source: './treeArray' },
  { name: 'SQLITE', source: './treeSQLite' }
];
// --------------- commands --------------- //

registerCmd('Show tree', '', 's', async () => {
  const nodes = await tree.getAllNodes();
  showTree(nodes);
  return '';
});

registerCmd('Show Object [parent] [...excluded Ids]', '', 'o', async function (...args) {
  console.log(args);
  const parent = args[0];
  const excluded = args.slice(1);
  const nodes = parent ? await tree.getQuery(parent, excluded) : await tree.getAllNodes();
  const treeO = getTreeObject(nodes);
  return require('util').inspect(treeO, false, 100, true);
});

registerCmd('Add a node', '<name> [parent]', '+', async (name, parentName = 'root') => {
  const res = await tree.addNode(name, parentName);
  showTree(await tree.getAllNodes(), true);
  return res;
});

registerCmd('Remove a node', '<name>', '-', async (name) => {
  const res = await tree.removeNode(name);
  showTree(await tree.getAllNodes(), true);
  return res;
});

registerCmd('Move a node', '<name> <destination>', 'm', async (name, destinationName) => {
  const node = await tree.nodeByName(name, 'name');
  const destination = await tree.nodeByName(destinationName, 'destination');
  const res = await tree.moveNode(node, destination);
  showTree(await tree.getAllNodes(), true);
  return res;
});

registerCmd('Get parents', '<name>', 'p', async (name) => {
  const res = await tree.getParents(name);
  if (!Array.isArray(res)) return res;
  const names = res.map((n) => n.name);
  return `Parents of "${name}": ${names.join('/')}`;
});

registerCmd('Get childrens', '<name> [maxDepth]', 'c', async (name, maxDepth) => {
  const depth = Number.parseInt(maxDepth);
  const res = await tree.getChildren(name, depth);
  if (!Array.isArray(res)) return res;
  const names = res.map((n) => n.name);
  return `Children of "${name}": ${names.join(', ')}`;
});

registerCmd('Load base tree', '', 'b', async function quit () {
  for (const a of baseTree) {
    const res = await tree.addNode(a[0], a[1]);
    if (res.startsWith('Error')) console.log(res);
  }
  showTree(await tree.getAllNodes(), true);
  return 'Base tree loaded';
});

registerCmd('Random moves', '[moves = 100]', 'r', async (nMoves = 100) => {
  for (let i = 0; i < nMoves; i++) {
    try {
      await tree.moveRandomNode();
      isValidTree(await tree.getAllNodes(), true);
    } catch (e) {
      console.log(`** Stopped after ${i}/${nMoves} random moves`);
      throw e;
    }
  }
  showTree(await tree.getAllNodes(), true);
  return `Executed ${nMoves} random moves`;
});

// start
(async () => {
  console.log('Choose an implementation from the list');
  for (let i = 0; i < trees.length; i++) {
    console.log(` ${i} -  ${trees[i].name}`);
  }
  const res = await question('(default 1):');
  let choice = Number.parseInt(res[0]);
  if (Number.isNaN(choice) || choice >= trees.length) choice = 1;
  tree = require(trees[choice].source);
  console.log(`>> using ${trees[choice].name} <<`);
  startReadline();
})();
