const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs');

const getProtoPath = (filename) => {
    const localPath = path.resolve(__dirname, '../../proto', filename);
    if (fs.existsSync(localPath)) return localPath;
    return path.resolve(__dirname, '../../../backend-rest/proto', filename);
};

const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
};

const vehiclePackageDef = protoLoader.loadSync(getProtoPath('vehicle.proto'), options);
const customerPackageDef = protoLoader.loadSync(getProtoPath('customer.proto'), options);

const vehicleProto = grpc.loadPackageDefinition(vehiclePackageDef).rentar.vehicle.v1;
const customerProto = grpc.loadPackageDefinition(customerPackageDef).rentar.customer.v1;

const vehicleUrl = process.env.VEHICLE_GRPC_URL || 'localhost:50051';
const customerUrl = process.env.CUSTOMER_GRPC_URL || 'localhost:50052';

const vehicleClient = new vehicleProto.VehicleService(vehicleUrl, grpc.credentials.createInsecure());
const customerClient = new customerProto.CustomerService(customerUrl, grpc.credentials.createInsecure());

module.exports = {
    vehicleClient,
    customerClient
};
