const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

async function testHelius() {
  const response = await fetch(HELIUS_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'test',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: 'V5GXkVYn2h1PDKg2kKcXFbn1Fh3WVz13wQVsjYEfB8t',
        page: 1,
        limit: 5,
        displayOptions: {
          showFungible: false,
        },
      },
    }),
  });
  
  const data = await response.json();
  
  if (data.result?.items?.[0]) {
    const asset = data.result.items[0];
    console.log('Top-level fields:', Object.keys(asset));
    console.log('\nSpam-related fields:');
    console.log('- burnt:', asset.burnt);
    console.log('- ownership:', JSON.stringify(asset.ownership, null, 2));
    console.log('- compression:', JSON.stringify(asset.compression, null, 2));
    console.log('- content.metadata.attributes:', asset.content?.metadata?.attributes?.find(a => a.trait_type?.toLowerCase()?.includes('spam')));
  }
}

testHelius().catch(console.error);
