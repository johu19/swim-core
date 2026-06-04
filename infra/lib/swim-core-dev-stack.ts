import * as path from 'node:path';
import {
  CfnOutput,
  Duration,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import {
  AccountRecovery,
  UserPool,
  UserPoolClient,
} from 'aws-cdk-lib/aws-cognito';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class SwimCoreDevStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const repoRootPath = path.resolve(__dirname, '../..');
    const rootPackageLockFilePath = path.join(repoRootPath, 'package-lock.json');

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
    });

    const userPool = new UserPool(this, 'SwimCoreUserPool', {
      userPoolName: 'swim-core-dev-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
    });

    const userPoolClient = new UserPoolClient(this, 'SwimCoreUserPoolClient', {
      userPool,
      userPoolClientName: 'swim-core-dev-client',
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    const jwtAuthorizer = new HttpJwtAuthorizer(
      'SwimCoreJwtAuthorizer',
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
      },
    );

    const createLambda = (id: string, functionName: string, entryFileName: string) =>
      new NodejsFunction(this, id, {
        functionName,
        runtime: Runtime.NODEJS_24_X,
        entry: path.join(repoRootPath, `src/functions/${entryFileName}.ts`),
        handler: 'handler',
        depsLockFilePath: rootPackageLockFilePath,
        bundling: {
          target: 'node24',
        },
        timeout: Duration.seconds(10),
        environment: {
          SWIM_CORE_TABLE_NAME: table.tableName,
        },
      });

    const healthLambda = createLambda(
      'HealthLambda',
      'swim-core-dev-health',
      'health',
    );
    const getProfileLambda = createLambda(
      'GetProfileLambda',
      'swim-core-dev-get-profile',
      'get-profile',
    );
    const patchProfileLambda = createLambda(
      'PatchProfileLambda',
      'swim-core-dev-patch-profile',
      'patch-profile',
    );
    const createPerformanceLambda = createLambda(
      'CreatePerformanceLambda',
      'swim-core-dev-create-performance',
      'create-performance',
    );
    const patchPerformanceLambda = createLambda(
      'PatchPerformanceLambda',
      'swim-core-dev-patch-performance',
      'patch-performance',
    );
    const deletePerformanceLambda = createLambda(
      'DeletePerformanceLambda',
      'swim-core-dev-delete-performance',
      'delete-performance',
    );
    const getPerformancesLambda = createLambda(
      'GetPerformancesLambda',
      'swim-core-dev-get-performances',
      'get-performances',
    );

    table.grantReadData(healthLambda);
    table.grantReadWriteData(getProfileLambda);
    table.grantReadWriteData(patchProfileLambda);
    table.grantReadWriteData(createPerformanceLambda);
    table.grantReadWriteData(patchPerformanceLambda);
    table.grantReadWriteData(deletePerformanceLambda);
    table.grantReadData(getPerformancesLambda);

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

    api.addRoutes({
      path: '/me/profile',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        'GetProfileLambdaIntegration',
        getProfileLambda,
      ),
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/me/profile',
      methods: [HttpMethod.PATCH],
      integration: new HttpLambdaIntegration(
        'PatchProfileLambdaIntegration',
        patchProfileLambda,
      ),
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/performances',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        'CreatePerformanceLambdaIntegration',
        createPerformanceLambda,
      ),
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/performances',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        'GetPerformancesLambdaIntegration',
        getPerformancesLambda,
      ),
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/performances/{performanceId}',
      methods: [HttpMethod.PATCH],
      integration: new HttpLambdaIntegration(
        'PatchPerformanceLambdaIntegration',
        patchPerformanceLambda,
      ),
      authorizer: jwtAuthorizer,
    });

    api.addRoutes({
      path: '/performances/{performanceId}',
      methods: [HttpMethod.DELETE],
      integration: new HttpLambdaIntegration(
        'DeletePerformanceLambdaIntegration',
        deletePerformanceLambda,
      ),
      authorizer: jwtAuthorizer,
    });

    new CfnOutput(this, 'HealthEndpointUrl', {
      value: `${api.apiEndpoint}/health`,
    });

    new CfnOutput(this, 'SwimCoreTableName', {
      value: table.tableName,
    });

    new CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });

    new CfnOutput(this, 'UserPoolIssuerUrl', {
      value: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
    });
  }
}
