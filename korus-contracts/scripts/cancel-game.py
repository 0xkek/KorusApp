#!/usr/bin/env python3
"""
Cancel a game on the Solana blockchain
Usage: python3 cancel-game.py <game_id> <wallet_keypair_path>
"""

import sys
import json
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import Transaction
from solders.instruction import Instruction, AccountMeta
from solders.system_program import ID as SYS_PROGRAM_ID
from solana.rpc.api import Client
import hashlib

PROGRAM_ID = Pubkey.from_string("4iUdAkPRmZLzUFXTLpt5QPGmUUtP6yfgpPpF3sLD9xtd")

def get_discriminator(name: str) -> bytes:
    """Calculate Anchor instruction discriminator"""
    return hashlib.sha256(name.encode()).digest()[:8]

def find_program_address(seeds: list, program_id: Pubkey) -> tuple:
    """Find PDA for given seeds"""
    seed_bytes = []
    for seed in seeds:
        if isinstance(seed, str):
            seed_bytes.append(seed.encode())
        elif isinstance(seed, bytes):
            seed_bytes.append(seed)
        elif isinstance(seed, int):
            seed_bytes.append(seed.to_bytes(8, 'little'))

    return Pubkey.find_program_address(seed_bytes, program_id)

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 cancel-game.py <game_id> <wallet_keypair_path>")
        sys.exit(1)

    game_id = int(sys.argv[1])
    keypair_path = sys.argv[2]

    print(f"🚫 Cancelling game {game_id}")
    print("=" * 50)

    # Load wallet keypair
    with open(keypair_path, 'r') as f:
        keypair_data = json.load(f)
    player_keypair = Keypair.from_bytes(bytes(keypair_data))
    player_pubkey = player_keypair.pubkey()

    print(f"Player: {player_pubkey}")

    # Connect to devnet
    client = Client("https://api.devnet.solana.com")

    # Get balance
    balance_resp = client.get_balance(player_pubkey)
    balance = balance_resp.value / 1e9
    print(f"Balance: {balance} SOL")

    # Derive PDAs
    state_pda, _ = find_program_address([b"state"], PROGRAM_ID)
    game_pda, _ = find_program_address([b"game", game_id], PROGRAM_ID)
    player_state_pda, _ = find_program_address([b"player", bytes(player_pubkey)], PROGRAM_ID)
    escrow_pda, _ = find_program_address([b"escrow", bytes(game_pda)], PROGRAM_ID)

    print("\nPDAs:")
    print(f"  State: {state_pda}")
    print(f"  Game: {game_pda}")
    print(f"  Player State: {player_state_pda}")
    print(f"  Escrow: {escrow_pda}")

    # Create cancel_game instruction
    discriminator = get_discriminator("global:cancel_game")
    print(f"\nDiscriminator: {list(discriminator)}")

    instruction = Instruction(
        program_id=PROGRAM_ID,
        accounts=[
            AccountMeta(pubkey=state_pda, is_signer=False, is_writable=True),
            AccountMeta(pubkey=game_pda, is_signer=False, is_writable=True),
            AccountMeta(pubkey=player_state_pda, is_signer=False, is_writable=True),
            AccountMeta(pubkey=escrow_pda, is_signer=False, is_writable=True),
            AccountMeta(pubkey=player_pubkey, is_signer=True, is_writable=True),
            AccountMeta(pubkey=SYS_PROGRAM_ID, is_signer=False, is_writable=False),
        ],
        data=discriminator,
    )

    # Create and send transaction
    recent_blockhash = client.get_latest_blockhash().value.blockhash
    transaction = Transaction.new_with_payer([instruction], player_pubkey)
    transaction.recent_blockhash = recent_blockhash
    transaction.sign([player_keypair])

    try:
        print("\n📤 Sending cancel transaction...")
        result = client.send_transaction(transaction)
        signature = result.value

        print("✅ Game cancelled successfully!")
        print(f"Transaction signature: {signature}")
        print(f"Explorer: https://explorer.solana.com/tx/{signature}?cluster=devnet")
    except Exception as e:
        print(f"\n❌ Failed to cancel game: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
