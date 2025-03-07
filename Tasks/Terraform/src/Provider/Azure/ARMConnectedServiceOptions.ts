import { injectable } from "inversify";
import task = require('azure-pipelines-task-lib/task');
import fs = require("fs");
import path = require("path");
import { ARMAuthenticationMethod } from "./ARMAuthenticationMethod";

/**
 * Loads connected service data for ARM from the Task into a strongly-typed object
 */
@injectable()
export class ARMConnectedServiceOptions {
    public clientId: string = "";
    public clientSecret: string = "";
    public clientCertificatePath: string = "";
    public tenantId: string = "";
    public subscriptionId: string = "";
    public authenticationMethod: ARMAuthenticationMethod = ARMAuthenticationMethod.Unknown;

    constructor(private connectedServiceName: string) {
        let authScheme = task.getEndpointAuthorizationScheme(connectedServiceName, true);

        this.loadArmDetails();

        switch(authScheme.toLowerCase()) {
            case "serviceprincipal":
                this.loadServicePrincipalDetails();
                break;
            case "managedserviceidentity":
                this.loadManagedIdentityDetails();
                break;
        }
    }

    /**
     * Sets ARM Tenant and subscription details based on the connected service
     */
    private loadArmDetails() {
        this.tenantId = task.getEndpointAuthorizationParameter(this.connectedServiceName, "tenantid", true);
        this.subscriptionId = task.getEndpointDataParameter(this.connectedServiceName, 'subscriptionid', true);
    }

    /**
     * Sets service principal details based on the connected service
     */
    private loadServicePrincipalDetails() {
        let authType = task.getEndpointAuthorizationParameter(this.connectedServiceName, 'authenticationType', true);
        this.clientId = task.getEndpointAuthorizationParameter(this.connectedServiceName, "serviceprincipalid", false);

        switch(authType) {
            case "spnCertificate":
                    this.loadServicePrincipalCertificateDetails();
                break;
            default:
                this.loadServicePrincipalKeyDetails();
        }
    }

    /**
     * Sets service principal key details based on the connected service
     */
    private loadServicePrincipalKeyDetails() {
        this.authenticationMethod = ARMAuthenticationMethod.ServicePrincipalKey;
        this.clientSecret = task.getEndpointAuthorizationParameter(this.connectedServiceName, "serviceprincipalkey", false);
    }

    /**
     * Sets service principal certificate details based on the connected service
     */
    private loadServicePrincipalCertificateDetails() {
        this.authenticationMethod = ARMAuthenticationMethod.ServicePrincipalCertificate;
        let certificateContent: string = task.getEndpointAuthorizationParameter(this.connectedServiceName, "servicePrincipalCertificate", false);
        let certificatePath = path.join(task.getVariable('Agent.TempDirectory') || task.getVariable('system.DefaultWorkingDirectory'), 'spnCert.pem');
        
        fs.writeFileSync(certificatePath, certificateContent);

        this.clientCertificatePath = certificatePath;
    }

    /**
     * Sets service principal certificate details based on the connected service
     */
    private loadManagedIdentityDetails() {
        this.authenticationMethod = ARMAuthenticationMethod.ManagedIdentity;
    }
}