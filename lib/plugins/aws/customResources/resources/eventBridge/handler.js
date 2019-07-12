'use strict';

const { addPermission, removePermission } = require('./lib/permissions');
const {
  updateRuleConfiguration,
  updateTargetConfiguration,
  removeRuleConfiguration,
  removeTargetConfiguration,
} = require('./lib/eventBridge');
const { getRuleName, getEventBusName } = require('./lib/utils');
const { getEnvironment, getLambdaArn, handlerWrapper } = require('../utils');

function handler(event, context) {
  if (event.RequestType === 'Create') {
    return create(event, context);
  } else if (event.RequestType === 'Update') {
    return update(event, context);
  } else if (event.RequestType === 'Delete') {
    return remove(event, context);
  }
  throw new Error(`Unhandled RequestType ${event.RequestType}`);
}

function create(event, context) {
  const { FunctionName, EventBridgeName, EventBridgeConfig } = event.ResourceProperties;
  const { Region, AccountId } = getEnvironment(context);

  const lambdaArn = getLambdaArn(Region, AccountId, FunctionName);
  const ruleName = getRuleName(EventBridgeName);
  const eventBusName = getEventBusName(EventBridgeConfig);

  return addPermission({
    functionName: FunctionName,
    region: Region,
    accountId: AccountId,
    ruleName,
  })
    .then(() =>
      updateRuleConfiguration({
        region: Region,
        ruleName,
        eventBusName,
        pattern: EventBridgeConfig.Pattern,
        schedule: EventBridgeConfig.Schedule,
      })
    )
    .then(() =>
      updateTargetConfiguration({
        lambdaArn,
        region: Region,
        functionName: FunctionName,
        ruleName,
        eventBusName,
        input: EventBridgeConfig.Input,
        inputPath: EventBridgeConfig.InputPath,
        inputTransformer: EventBridgeConfig.InputTransformer,
      })
    );
}

function update(event, context) {
  const { Region, AccountId } = getEnvironment(context);
  const { FunctionName, EventBridgeName, EventBridgeConfig } = event.ResourceProperties;

  const lambdaArn = getLambdaArn(Region, AccountId, FunctionName);
  const ruleName = getRuleName(EventBridgeName);
  const eventBusName = getEventBusName(EventBridgeConfig);

  return updateRuleConfiguration({
    region: Region,
    ruleName,
    eventBusName,
    pattern: EventBridgeConfig.Pattern,
    schedule: EventBridgeConfig.Schedule,
  }).then(() =>
    updateTargetConfiguration({
      lambdaArn,
      region: Region,
      functionName: FunctionName,
      ruleName,
      eventBusName,
      input: EventBridgeConfig.Input,
      inputPath: EventBridgeConfig.InputPath,
      inputTransformer: EventBridgeConfig.InputTransformer,
    })
  );
}

function remove(event, context) {
  const { Region } = getEnvironment(context);
  const { FunctionName, EventBridgeName, EventBridgeConfig } = event.ResourceProperties;

  const ruleName = getRuleName(EventBridgeName);
  const eventBusName = getEventBusName(EventBridgeConfig);

  return removePermission({
    functionName: FunctionName,
    region: Region,
    ruleName,
  })
    .then(() =>
      removeTargetConfiguration({
        functionName: FunctionName,
        ruleName,
        eventBusName,
        region: Region,
      })
    )
    .then(() =>
      removeRuleConfiguration({
        ruleName,
        eventBusName,
        region: Region,
      })
    );
}

module.exports = {
  handler: handlerWrapper(handler, 'CustomResouceEventBridge'),
};
