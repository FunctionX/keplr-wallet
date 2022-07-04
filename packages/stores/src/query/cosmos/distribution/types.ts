import { CoinPrimitive } from "../../../common";

export type DistributionParams = {
  params: {
    community_tax: string;
    base_proposer_reward: string;
    bonus_proposer_reward: string;
    withdraw_addr_enabled: boolean;
  };
};

export type DistributionCommission = {
  commission: {
    commission: CoinPrimitive[];
  };
};
