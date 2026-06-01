type EnvKey =
  | 'AWS_REGION'
  | 'DYNAMODB_ENDPOINT'
  | 'SWIM_CORE_TABLE_NAME';

type AppConfig = {
  awsRegion: string;
  dynamoDbEndpoint?: string;
  swimCoreTableName: string;
};

function getEnv(name: EnvKey) {
  return process.env[name];
}

function requireEnv(name: EnvKey) {
  const value = getEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getConfig(): AppConfig {
  return {
    awsRegion: requireEnv('AWS_REGION'),
    dynamoDbEndpoint: getEnv('DYNAMODB_ENDPOINT'),
    swimCoreTableName: requireEnv('SWIM_CORE_TABLE_NAME'),
  };
}
