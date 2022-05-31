import { SupplyTotal } from "./types";
import { KVStore } from "@keplr-wallet/common";
import {
  ObservableChainQuery,
  ObservableChainQueryMap,
} from "../../chain-query";
import { ChainGetter } from "../../../common";

export class ObservableChainQuerySupplyTotal extends ObservableChainQuery<SupplyTotal> {
  constructor(kvStore: KVStore, chainId: string, chainGetter: ChainGetter) {
    super(kvStore, chainId, chainGetter, `/cosmos/bank/v1beta1/supply`);
  }
}

export class ObservableQuerySupplyTotal extends ObservableChainQueryMap<SupplyTotal> {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter
  ) {
    super(kvStore, chainId, chainGetter, () => {
      return new ObservableChainQuerySupplyTotal(
        this.kvStore,
        this.chainId,
        this.chainGetter
      );
    });
  }

  getQuery(): ObservableChainQuerySupplyTotal {
    return this.get("supply_total");
  }
}
