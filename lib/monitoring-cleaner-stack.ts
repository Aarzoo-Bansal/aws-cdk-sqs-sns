import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';

interface MonitoringCleanerStackProps extends cdk.StackProps {
  logGroup: logs.LogGroup;
  bucket: s3.Bucket;
}

export class MonitoringCleanerStack extends cdk.Stack {
  public readonly cleanerLambda: lambda.Function;
  public readonly alarm: cloudwatch.Alarm;

  constructor(scope: Construct, id: string, props: MonitoringCleanerStackProps) {
    super(scope, id, props);

    /***********************************************************************************************************************************/
    // Create Cleaner Lambda first
    this.cleanerLambda = new lambda.Function(this, 'CleanerFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/cleaner'),
      environment: {
        BUCKET_NAME: props.bucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    /***********************************************************************************************************************************/
    // Grant permissions to cleaner
    props.bucket.grantRead(this.cleanerLambda);
    props.bucket.grantDelete(this.cleanerLambda);

    /***********************************************************************************************************************************/
    // Reference the existing log group
    // const logGroup = logs.LogGroup.fromLogGroupName(
    //   this,
    //   'LoggingLambdaLogGroup',
    //   props.logGroup
    // );

    /***********************************************************************************************************************************/
    // Create metric filter
    const metricFilter = new logs.MetricFilter(this, 'SizeDeltaMetricFilter', {
      logGroup: props.logGroup,
      metricNamespace: 'Assignment4App',
      metricName: 'TotalObjectSize',
      filterPattern: logs.FilterPattern.exists('$.size_delta'),
      metricValue: '$.size_delta',
    });

    /***********************************************************************************************************************************/
    // Create the metric
    const metric = new cloudwatch.Metric({
      namespace: 'Assignment4App',
      metricName: 'TotalObjectSize',
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
    });

    /***********************************************************************************************************************************/
    // Create alarm
    this.alarm = new cloudwatch.Alarm(this, 'TotalSizeAlarm', {
      metric: metric,
      threshold: 20,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'Alarm when total object size exceeds 20 bytes',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    /***********************************************************************************************************************************/
    // Add alarm action to trigger Cleaner Lambda
    this.alarm.addAlarmAction(
      new cloudwatch_actions.LambdaAction(this.cleanerLambda)
    );

    /***********************************************************************************************************************************/
    new cdk.CfnOutput(this, 'AlarmName', {
      value: this.alarm.alarmName,
    });
  }
}