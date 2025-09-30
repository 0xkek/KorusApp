const crypto = require('crypto');

function calculateDiscriminator(namespace, name) {
  const preimage = `${namespace}:${name}`;
  const hash = crypto.createHash('sha256').update(preimage, 'utf8').digest();
  return hash.slice(0, 8);
}

// For Anchor programs, the namespace is "global" for instructions
const instructions = [
  'initialize',
  'create_game',
  'create_game_with_deposit',
  'join_game',
  'cancel_game'
];

console.log("Anchor Instruction Discriminators:");
console.log("===================================");

instructions.forEach(instruction => {
  const discriminator = calculateDiscriminator('global', instruction);
  console.log(`${instruction}:`);
  console.log(`  Hex: ${discriminator.toString('hex')}`);
  console.log(`  Array: [${Array.from(discriminator).join(', ')}]`);
});