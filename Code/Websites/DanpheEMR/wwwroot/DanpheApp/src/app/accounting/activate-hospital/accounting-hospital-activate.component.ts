import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { AccountingBLService } from '../shared/accounting.bl.service';
import { MessageboxService } from '../../shared/messagebox/messagebox.service';
import { SecurityService } from '../../security/shared/security.service';
import { DanpheHTTPResponse } from '../../shared/common-models';
import * as moment from 'moment/moment';
import { CoreService } from '../../core/shared/core.service';


@Component({
    selector: 'accounting-hospital-activate',
    templateUrl: './accounting-hospital-activate.html',
    styles: [`.display-blk{display: block;} .col-4{flex-basis: 31%;box-shadow: 0px 1px 4px -1px rgba(19, 19, 19, 0.62); padding: 5px 15px; margin-bottom: 15px;}
    padding:{0px 0px 15px;} .margin-15-bt{margin-bottom: 15px;} .justify-sp-around{-webkit-justify-content: space-around;
    justify-content: space-around;}`]
})
export class ActivateAccountingHospitalComponent {
    public allHospitalsPermissions: any;
    public totalNumOfPermissions: number = 0;
    @Input() public changeRequest: boolean = false;
    @Output("actionEmitter") dataEmitter: EventEmitter<object> = new EventEmitter<object>();
    public singleTenantPermissionAssigned: any;

    public isSinglePermissionOnly: boolean = true;

    constructor(private _router: Router, public accBLService: AccountingBLService,
        public msgBoxServ: MessageboxService, public securityServ: SecurityService,private coreService:CoreService) {

    }

    ngOnInit() {
        // if (!this.changeRequest) {
        //     let activeHospital = this.securityServ.getActiveHospitalInAccounting();
        //     if (activeHospital && activeHospital.HospitalId) {
        //         this._router.navigate(['/Accounting/Transaction/VoucherEntry']);
        //     }
        // }
        this.GetAllActiveTenants();

    }

    GetAllActiveTenants() {

        this.accBLService.GetAllActiveAccTenants().subscribe(res => {
            if (res.Status == "OK") {
                this.totalNumOfPermissions = 0;//reset to zero at beginning.. 
                let allHospitalsMst = res.Results;
                this.allHospitalsPermissions = [];
                //if no permission or no-hospital then redirect to home page.

                if (allHospitalsMst && allHospitalsMst.length) {
                    let userHospPermissions = [];
                    allHospitalsMst.forEach(hosp => {

                        let permissionName = "acc-hospital-" + hosp.HospitalShortName;
                        if (this.securityServ.HasPermission(permissionName)) {
                            this.allHospitalsPermissions.push(hosp);
                            let permJSON = '{"name":"' + permissionName + '","actionOnInvalid":"remove"}';
                            hosp["PermissionInfo"] = permJSON;
                            this.totalNumOfPermissions++;
                            this.singleTenantPermissionAssigned = hosp;
                        }
                    });

                    //if no permission then redirect to home-index.
                    if (this.allHospitalsPermissions && this.allHospitalsPermissions.length > 0) {
                        //if only one of the Permission is Given then auto assign 
                        if (this.allHospitalsPermissions.length == 1) {
                            this.AssignAccountingTenant(this.singleTenantPermissionAssigned.HospitalId);
                        }
                        else {
                            this.isSinglePermissionOnly = false;
                        }
                    }
                    else {
                        this.msgBoxServ.showMessage("error", ["You don't have permission to accounting."]);
                        this._router.navigate(['']);
                    }

                }
                else {
                    this.msgBoxServ.showMessage("error", ["Accounting is not Configured for Hospital."]);
                    this._router.navigate(['']);
                }
            }
        }, err => {
            console.log(err)
        })
    }

    AssignAccountingTenant(tenantId) {
        let hosp = this.allHospitalsPermissions.find(h => h.HospitalId == tenantId);
        if (hosp) {
            this.accBLService.ActivateAccountingTenant(tenantId)
                .subscribe((res: DanpheHTTPResponse) => {
                    if (res.Status == "OK") {
                        this.securityServ.SetAccHospitalInfo(res.Results);

                        let curr_AccHospInfo = this.securityServ.AccHospitalInfo;
                        curr_AccHospInfo.HospitalLongName = hosp.HospitalLongName;
                        curr_AccHospInfo.HospitalShortName = hosp.HospitalShortName;
                        curr_AccHospInfo.TotalHospitalPermissionCount = this.totalNumOfPermissions;  
                        this.coreService.GetCodeDetails().subscribe(res => {      
                            this.coreService.SetCodeDetails(res);
                          });
                         
                          this.coreService.GetFiscalYearList().subscribe(res => {      
                            this.coreService.SetFiscalYearList(res);
                          });                      
                        // let curFiscYr = curr_AccHospInfo.FiscalYearList.find(f =>
                        //     moment(f.StartDate) <= moment() && moment() <= moment(f.EndDate)
                        // );
                        // curr_AccHospInfo.CurrFiscalYear = curFiscYr;


                        if (this.changeRequest) {
                            this.dataEmitter.emit({ activatedTenantChanged: true });
                        } else {
                            this._router.navigate(['/Accounting/Transaction/VoucherEntry']);
                        }

                        if (this.changeRequest || this.totalNumOfPermissions > 1) {
                            this.msgBoxServ.showMessage("success", ['Your new Accounting Tenant is Selected']);
                        }

                    }
                    else {
                        this.securityServ.SetAccHospitalInfo(null);
                        //this.securityServ.setActiveHospitalInAccounting(null);
                        this.msgBoxServ.showMessage("error", ['Cannot activate any tenant. Please try again Later']);
                    }
                }, err => {
                    console.log(err);
                    this.securityServ.SetAccHospitalInfo(null);
                    this.msgBoxServ.showMessage("error", ['Cannot activate any tenant. Please try again Later']);
                });
        }
    }

    ClosePopUp() {
        this.dataEmitter.emit({ activatedTenantChanged: false });
    }

}
