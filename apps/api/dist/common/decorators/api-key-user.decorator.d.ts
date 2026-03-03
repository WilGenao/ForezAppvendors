export interface ApiKeyPayload {
    userId: string;
    keyId: string;
    scopes: string[];
}
export declare const ApiKeyUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
