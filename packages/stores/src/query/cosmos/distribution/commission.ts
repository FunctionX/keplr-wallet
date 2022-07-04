import {
  ObservableChainQuery,
  ObservableChainQueryMap,
} from "../../chain-query";
import { DistributionCommission } from "./types";
import { KVStore } from "@keplr-wallet/common";
import { ChainGetter, CoinPrimitive } from "../../../common";
import { computed, makeObservable } from "mobx";

export class ObservableQueryDistributionInner extends ObservableChainQuery<DistributionCommission> {
  protected valAddress: string;
  constructor(
    kvStore: KVStore,
    chainId: string,
    chainGetter: ChainGetter,
    valAddress: string
  ) {
    super(
      kvStore,
      chainId,
      chainGetter,
      `/cosmos/distribution/v1beta1/validators/${valAddress}/commission`
    );

    makeObservable(this);
    this.valAddress = valAddress;
  }

  @computed
  get commissionRewards(): CoinPrimitive[] {
    if (!this.response) {
      return [];
    }

    return this.response.data.commission.commission;
  }
}

export class ObservableQueryDistribution extends ObservableChainQueryMap<DistributionCommission> {
  constructor(
    protected readonly kvStore: KVStore,
    protected readonly chainId: string,
    protected readonly chainGetter: ChainGetter
  ) {
    super(kvStore, chainId, chainGetter, (valAddress: string) => {
      return new ObservableQueryDistributionInner(
        this.kvStore,
        this.chainId,
        this.chainGetter,
        valAddress
      );
    });
  }

  getQueryValAddress(valAddress: string): ObservableQueryDistributionInner {
    return this.get(valAddress) as ObservableQueryDistributionInner;
  }
}
