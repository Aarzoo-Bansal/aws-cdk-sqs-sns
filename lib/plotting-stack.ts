import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

interface PlottingStackProps extends cdk.StackProps {
    table: dynamodb.Table;
    bucket: s3.Bucket;
    indexName: string;
}

export class PlottingStack extends cdk.Stack {
    public readonly plottingLambda: lambda.Function;
    public readonly api: apigateway.LambdaRestApi;

    constructor(scope: Construct, id: string, props: PlottingStackProps) {
        super(scope, id, props);

        /***********************************************************************************************************************************/
        // Public matplotlib layer ARN (us-east-1 example)
        const matplotlibLayer = new lambda.LayerVersion(this, 'MatplotlibLayer', {
            code: lambda.Code.fromAsset('lambda-layers/matplotlib/matplotlib-layer.zip'),
            compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
            description: 'Matplotlib layer for plotting',
        });

        /***********************************************************************************************************************************/
        // Create Plotting Lambda
        this.plottingLambda = new lambda.Function(this, 'PlottingFunction', {
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/plotting'),
            environment: {
                TABLE_NAME: props.table.tableName,
                BUCKET_NAME: props.bucket.bucketName,
                INDEX_NAME: props.indexName,
            },
            timeout: cdk.Duration.seconds(60), // Plotting can take time
            memorySize: 512, // More memory for matplotlib
            layers: [matplotlibLayer]
        });

        /***********************************************************************************************************************************/
        // Grant permissions
        props.table.grantReadData(this.plottingLambda);
        props.bucket.grantWrite(this.plottingLambda);

        /***********************************************************************************************************************************/
        // Create API Gateway
        this.api = new apigateway.LambdaRestApi(this, 'PlottingApi', {
            handler: this.plottingLambda,
            restApiName: 'Assignment4PlottingAPI',
            description: 'API to trigger plot generation',
            proxy: true,
        });

        /***********************************************************************************************************************************/
        // Output the API URL
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: this.api.url,
            description: 'URL to trigger plot generation',
        });
    }
}