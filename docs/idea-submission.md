# Zoopfi: private, compliant payments on Stellar

**One line:** A payments wallet where money moves privately by default, and every private payment is proven clean by a zero-knowledge proof that a Stellar smart contract verifies on-chain.

## The problem

Your bank does not publish your salary, your rent, or your balance on a public board. Crypto does. Every payment on a transparent chain is permanent and public: the amount, who you paid, and what you hold, forever. That is fine for a trading toy. It is a non-starter for the money people and businesses actually move.

The usual fix made things worse. Mixers gave users privacy, then filled up with stolen and sanctioned funds and got blacklisted, dragging honest users down with them. So privacy in crypto has been stuck between two bad choices: no privacy at all, or privacy that is radioactive.

## The insight

The missing piece is not more privacy. It is privacy that can prove it is clean. A person should be able to hide their amount and their counterparty from the public while still proving, in zero knowledge, that their funds are not coming from a sanctioned or stolen source. Privacy for the user, accountability for the system, and neither side has to leak the other.

## What Zoopfi does

Zoopfi is a wallet where payments are private by default. Funds in the pool are held as commitments (Poseidon2 hashes that reveal nothing about amount or owner). To spend, you prove inside a Groth16 circuit that you own valid notes, that you are not double spending, and that your funds satisfy an Association Set Provider (ASP) allow / deny policy. The amount and the sender-to-recipient link never appear in the clear. The proof is checked by an on-chain Stellar verifier contract, and the pool only changes state if it verifies.

That ASP check is the whole point. It is how a private payment proves it is not tied to a deny-listed source without revealing who you are: privacy that is compliant by construction, not privacy that hopes regulators look away.

## Why this is real-world ZK

Payments are the one place where privacy is non-optional and compliance is non-negotiable at the same time. Nobody wants their salary, their vendor list, or their savings public. And no business or regulator will touch a rail that cannot keep illicit money out. The ASP proof is what turns "private payments" from a research demo or a sanctions magnet into something a real company, and eventually a real bank, can run.

## Why Stellar

Stellar was built for payments: fast, a few cents per transaction, cash-like, with a mission of financial access. Its Protocol 25/26 BN254 host functions let a contract verify Groth16 proofs on-chain natively, so the privacy lives in a smart contract instead of a server you have to trust. Private, compliant, cheap, and reachable from a phone is a payments network the rest of the world can actually use.

## What is built (today, on testnet)

This is a working product, not a deck.

- **Consumer:** pay any `@username`, privately or publicly, with social login that provisions a self-custodial Stellar wallet, no seed phrase. Shielded balances and shielded sends.
- **Business:** a merchant workspace to accept payments, run payroll without exposing every salary, send invoices, and keep private books.
- **DeFi on the same rails:** a DEX swap and a yield vault, with private yield on the roadmap.
- **Live on Stellar testnet:** the shielded pool, the Groth16 verifier, and the ASP contracts are deployed; proofs are generated in the browser so spending keys never leave the device; and there is a verifiable contract-call transaction on-chain.

## The vision

Money should move the way cash does for the person spending it, and the way a ledger does for the system that keeps it honest: private at the edges, accountable underneath. Zoopfi is that default. A wallet simple enough for anyone (social login, pay by name) sitting on a compliance-aware ZK rail that a regulator could sign off on. Privacy that real people and real businesses can actually use.
