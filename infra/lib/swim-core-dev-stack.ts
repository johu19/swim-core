import * as path from 'node:path';
import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class SwimCoreDevStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const repoRootPath = path.resolve(__dirname, '../..');

    const table = new Table(this, 'SwimCoreTable', {
      tableName: 'swim-core-dev',
      partitionKey: {
        name: 'pk',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const healthLambda = new NodejsFunction(this, 'HealthLambda', {
      functionName: 'swim-core-dev-health',
      runtime: Runtime.NODEJS_24_X,
      entry: path.join(repoRootPath, 'src/functions/health.ts'),
      handler: 'handler',
      depsLockFilePath: path.join(repoRootPath, 'package-lock.json'),
      bundling: {
        target: 'node24',
      },
      timeout: Duration.seconds(10),
      environment: {
        SWIM_CORE_TABLE_NAME: table.tableName,
      },
    });

    table.grantReadData(healthLambda);

    const api = new HttpApi(this, 'SwimCoreApi', {
      apiName: 'swim-core-dev-api',
    });

    api.addRoutes({
      path: '/health',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        'HealthLambdaIntegration',
        healthLambda,
      ),
    });

    new CfnOutput(this, 'HealthEndpointUrl', {
      value: `${api.apiEndpoint}/health`,
    });

    new CfnOutput(this, 'SwimCoreTableName', {
      value: table.tableName,
    });
  }
}
