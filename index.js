const readline = require('node:readline');

start();

const tree = [{left: 0, right: 1, depth: 0, name: 'root'}];

async function start () {
  const commands = { };
  const commandsDesc = [];

  // --------------- commands --------------- //

  register('List', ['l'], async () => {
    console.log(tree);
  });

  register('Add a node <name> [parent]', ['+'], async (name, parentName = 'root') => {
    return addNode(name, parentName);
  });

  register('Remove a node', ['-'], async (name, parentName = 'root') => {
    return removeNode(name);
  });

  register('Load base tree', ['b'], async function quit () {
    for (const a of baseTree) {
      const res = addNode(a[0], a[1]);
      if (res.startsWith('Error')) console.log(res);
    }
    return 'Base tree loaded';
  });

  register('Quit', ['q'], async function quit () {
    process.exit(0);
  });

  // -- readLine

  function register (title, keys, func) {
    commandsDesc.push({ title, keys });
    for (const key of keys) {
      if (commands[key] != null) throw Error(`Tried to register twice command: ${key}`);
      commands[key] = func;
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function recursiveAsyncReadLine () {
    rl.question('\nCommand: ', async function (cmd) {
      const cmds = cmd.split(' ');
      const key = cmds[0];
      const args = cmds.slice(1);
      if (commands[key] == null) {
        console.log('*** No existing command: "' + key + '"');
        showUsage();
      } else {
        try {
          const res = await commands[key](...args);
          console.log(res);
          showTree()
        } catch (e) {
          console.log(e);
        }
      }
      recursiveAsyncReadLine(); // Calling this function again to ask new question
    });
  }

  function showUsage () {
    for (const com of commandsDesc) {
      console.log(`- ${com.keys.join(', ')} \t ${com.title}`);
    }
  }

  showUsage();
  recursiveAsyncReadLine();
}

function showTree() {
  for (const n of tree) {
    const spacing = '                      '.substring(0,n.depth * 2);
    console.log(spacing + n.name + ' l:' + n.left + ' r:' + n.right);
  }
}

/**
 * Remove a node
 */
function removeNode (name) {
  if (name == null) return 'Error: name missing, usage a <name> [parent Name]';
  const found = tree.find((n) => n.name === name);
  if (found == null) return `Error: node with name "${name}" already exists`;
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
  const node = {left: parentCopy.right, right: parentCopy.right + 1, depth: parent.depth + 1, name};
  tree.push(node);
  // sort tree
  tree.sort((a, b) => a.left - b.left);
  return 'Added ' + name;
}

const baseTree = [
  ['a'],['aa','a'],['aaa', 'aa'], ['aaaa','aaa'], ['ab', 'a'],['ac','a'],
  ['b'],['bb','b'],['bbb', 'bb'], ['bbbb','bbb'], ['bb', 'b'],['bc','b'],
  ['c'],['cc','c'],['cb', 'c']
];