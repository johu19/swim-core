type EnvKey =
  | 'AWS_REGION'
  | 'AWS_ACCESS_KEY_ID'
  | 'AWS_SECRET_ACCESS_KEY'
  | 'DYNAMODB_ENDPOINT'
  | 'SWIM_CORE_TABLE_NAME';

type AppConfig = {
  awsRegion: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  dynamoDbEndpoint?: string;
  swimCoreTableName: string;
};

const DEFAULTS = {
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: 'local',
  AWS_SECRET_ACCESS_KEY: 'local',
  DYNAMODB_ENDPOINT: 'http://localhost:8000',
  SWIM_CORE_TABLE_NAME: 'swim-core',
} satisfies Record<EnvKey, string>;

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

export function loadLocalEnvDefaults() {
  for (const [name, value] of Object.entries(DEFAULTS)) {
    process.env[name as EnvKey] ??= value;
  }
}

export function getConfig(): AppConfig {
  return {
    awsRegion: requireEnv('AWS_REGION'),
    awsAccessKeyId: getEnv('AWS_ACCESS_KEY_ID'),
    awsSecretAccessKey: getEnv('AWS_SECRET_ACCESS_KEY'),
    dynamoDbEndpoint: getEnv('DYNAMODB_ENDPOINT'),
    swimCoreTableName: requireEnv('SWIM_CORE_TABLE_NAME'),
  };
}
