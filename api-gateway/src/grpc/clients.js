const path = require('path');
const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Los contratos viven en api-gateway/proto (copia de /proto de la raíz del repo).
const getProtoPath = (filename) => {
    const local = path.resolve(__dirname, '../../proto', filename);
    if (fs.existsSync(local)) return local;
    return path.resolve(__dirname, '../../../proto', filename);
};

const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
};

const load = (file) => grpc.loadPackageDefinition(protoLoader.loadSync(getProtoPath(file), options)).rentar;

const vehicleProto = load('vehicle.proto').vehicle.v1;
const customerProto = load('customer.proto').customer.v1;
const rentalProto = load('rental.proto').rental.v1;

const vehicleUrl = process.env.VEHICLE_GRPC_URL || 'localhost:50051';
const customerUrl = process.env.CUSTOMER_GRPC_URL || 'localhost:50052';
const rentalUrl = process.env.RENTAL_GRPC_URL || 'localhost:50053';

const vehicleClient = new vehicleProto.VehicleService(vehicleUrl, grpc.credentials.createInsecure());
const customerClient = new customerProto.CustomerService(customerUrl, grpc.credentials.createInsecure());
const rentalClient = new rentalProto.RentalService(rentalUrl, grpc.credentials.createInsecure());

const TIMEOUT_MS = 5000;

/** Llama a un RPC y devuelve una Promise (con timeout de 5 s). */
const call = (client, method, request = {}) => new Promise((resolve, reject) => {
    client[method](request, { deadline: new Date(Date.now() + TIMEOUT_MS) }, (err, response) => {
        if (err) return reject(err);
        resolve(response);
    });
});

module.exports = { vehicleClient, customerClient, rentalClient, call };
