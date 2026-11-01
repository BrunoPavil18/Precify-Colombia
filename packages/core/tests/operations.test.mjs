import test from "node:test";
import assert from "node:assert/strict";
import {computeCODFunnel,reconcileCampaigns,simulateCPASensitivity,advertisingIndicators} from "../dist/index.js";

const mk=(id,status,time,extra={})=>({
 id,orderId:"order-1",source:"csv",occurredAt:"2026-10-"+time+"T12:00:00Z",status,
 campaignId:"campaign-1",currency:"COP",grossRevenue:"100.00",productCost:"40.00",
 shippingCost:"10.00",reverseShippingCost:"7.00",advertisingCost:"3.00",
 otherCost:"0.00",refundAmount:"0.00",...extra
});
test("COD event replay does not duplicate orders or shipping costs",()=>{
 const events=[mk("e1","created","20"),mk("e2","shipped","21"),mk("e3","delivered","22"),mk("e4","paid","23")];
 const x=computeCODFunnel([...events,...events[2]?[events[2]]:[]]);
 assert.equal(x.orders,1);assert.equal(x.paid,1);assert.equal(x.shipped,1);
 assert.equal(x.grossCollected,"100.00");assert.equal(x.incurredCosts,"53.00");
 assert.equal(x.projectedNet,"47.00");
});
test("COD cancelled before shipment never incurs shipping cost",()=>{
 const x=computeCODFunnel([mk("e1","created","20",{campaignId:null}),mk("e2","cancelled","21",{campaignId:null})]);
 assert.equal(x.cancelled,1);assert.equal(x.shipped,0);assert.equal(x.incurredCosts,"3.00");
 assert.equal(x.unattributedOrders,1);
});
test("campaign attribution and paid-order matching are distinct",()=>{
 const events=[mk("e1","created","20"),mk("e2","paid","21")];
 const campaign={id:"campaign-1",source:"meta",currency:"COP",spend:"50.00",impressions:"1000",
  clicks:"20",attributedConversions:"10",attributedRevenue:"1000.00",
  observedFrom:"2026-10-20T00:00:00Z",observedTo:"2026-10-23T00:00:00Z"};
 const r=reconcileCampaigns(events,[campaign])[0];
 assert.equal(r.matchedOrders,1);assert.equal(r.paidOrders,1);
 assert.equal(r.observedNetRevenue,"100.00");assert.equal(r.discrepancy,"900.00");
 assert.equal(r.roasOnObservedOrders,"2.00");
});
test("CPA matrix uses shipped failures instead of all created orders",()=>{
 const params={createdOrders:"100",shippedPercent:"50",deliveredPercentOfShipped:"70",
  paidPercentOfDelivered:"100",contributionPerPaid:"100.00",failedDeliveryCost:"10.00",
  reverseShippingPerUnpaid:"0",advertisementPerCreated:"0",otherFixedCosts:"0"};
 const x=simulateCPASensitivity(params,["0","100"],["10.00"]);
 assert.equal(x[0].results[0].profit,"-1500.00");
 assert.equal(x[1].results[0].profit,"4000.00");
});

test("advertising indicators keep platform attribution separate from orders and handle zeros",()=>{
 const c={id:"meta:123",source:"meta",currency:"USD",spend:"100.00",
 impressions:"10000",clicks:"200",attributedConversions:"10",attributedRevenue:"500.00",
 observedFrom:"2026-10-20T00:00:00Z",observedTo:"2026-10-23T00:00:00Z"};
 const x=advertisingIndicators(c);
 assert.equal(x.ctrPercent,"2.00");assert.equal(x.cpc,"0.50");
 assert.equal(x.cpm,"10.00");assert.equal(x.attributedRoas,"5.00");
 assert.equal(advertisingIndicators({...c,impressions:"0",clicks:"0"}).cpc,null);
});


test("sparse paid and refund event snapshots preserve original sale, attribution and distinguish physical returns",()=>{
 const events=[
  mk("a","created","20",{grossRevenue:"120.00",productCost:"50.00",shippingCost:"10.00",campaignId:"campaign-1"}),
  mk("b","shipped","21",{grossRevenue:"0",productCost:"0",shippingCost:"0",campaignId:null}),
  mk("c","paid","22",{grossRevenue:"0",productCost:"0",shippingCost:"0",campaignId:null}),
  mk("d","refunded","23",{grossRevenue:"0",productCost:"0",shippingCost:"0",refundAmount:"20.00",campaignId:null})
 ];
 const x=computeCODFunnel(events);
 assert.equal(x.paid,1);assert.equal(x.refunded,1);assert.equal(x.returned,0);
 assert.equal(x.grossCollected,"120.00");assert.equal(x.refunds,"20.00");
 assert.equal(x.netCollected,"100.00");
 assert.equal(x.snapshots[0].campaignId,"campaign-1");
});
test("conflicting duplicate events are rejected instead of silently ignored",()=>{
 const a=mk("same","created","20");
 assert.throws(()=>computeCODFunnel([a,{...a,grossRevenue:"999.00"}]));
});
test("invalid negative order costs and fictional currency codes are rejected",()=>{
 assert.throws(()=>computeCODFunnel([mk("neg","paid","20",{shippingCost:"-10.00"})]));
 assert.throws(()=>computeCODFunnel([mk("cur","paid","20",{currency:"ZZZ"})]));
});
