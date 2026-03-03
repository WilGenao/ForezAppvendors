export declare class CreateBotDto {
    name: string;
    shortDescription: string;
    description?: string;
    mtPlatform: string;
    currencyPairs: string[];
    timeframes: string[];
    riskLevel?: number;
}
