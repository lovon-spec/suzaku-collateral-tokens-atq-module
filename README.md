# Suzaku Default Collateral tokens

Unpublished ATQ draft for Avalanche (43114). The category is legacy Default Collateral ERC-20 wrapper contracts, not underlying assets or restaking vaults. The official archived Suzaku collateral repository documents Default Collateral and its ERC-20 implementation; code was copied into suzaku-core. The implementation derives from Symbiotic, as each note states.

Messari deployment list: https://github.com/messari/subgraphs/blob/master/deployment/deployment.json

Exact source subgraph ChnR9QwW6tzKt2hbuHLmHqeB1Sk35UzR1XDbxYBA3cvW, deployment QmYWxWtCAhUiNMAd6GQYXi7V2W2FGaWZrZufQEcTnMMYpP. The published mapping initializes each Pool from the Collateral Deposit/Withdraw emitter address; its name/symbol instead name the underlying asset. This module therefore uses an explicit Default Collateral label plus address prefix, and lists the exact indexed asset in the note. It binds protocol identity, handles complete Bytes-ID cursor pagination at one block hash, and throws on unknown roles, source errors, duplicates or label collisions. No source row is artificially capped.

References: https://github.com/messari/subgraphs/blob/master/subgraphs/suzaku/src/mappings/handlers.ts and https://github.com/suzaku-network/collateral

No claim of current deposits, restaking, backing or operator identity. No public retrieval, contract/role verification, overlap or review readiness is established by this local draft.
