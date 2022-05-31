export type SupplyTotal = {
  supply: [
    {
      denom: string;
      amount: string;
    }
  ];
  pagination: {
    next_key: string | undefined;
    total: string;
  };
};

export type MintingInflation = {
  // Dec
  inflation: string;
};
