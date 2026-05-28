#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { SwimCoreDevStack } from '../lib/swim-core-dev-stack';

const app = new cdk.App();
new SwimCoreDevStack(app, 'dev');
