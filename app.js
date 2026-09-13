const D=window.APP_DATA||{users:[],salaryRules:{},categoryProducts:{},products:[],outlets:{}};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const STORAGE='sph.final.v3',SESSION='sph.session.final.v3',BACKEND='sph.backendUrl';
let session=null,page='dashboard',selectedMonth=new Date().toISOString().slice(0,7),managerView='M21954',selectedSkus=[];

const n=v=>Number.isFinite(Number(v))?Number(v):0;
const money=v=>'RM '+n(v).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const idGen=()=>window.crypto?.randomUUID?crypto.randomUUID():'id-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const today=()=>new Date().toISOString().slice(0,10);

function toast(m){
    const t=$('#toast');
    if(!t)return;
    t.textContent=m;
    t.classList.add('show');
    clearTimeout(window.__tt);
    window.__tt=setTimeout(()=>t.classList.remove('show'),2200);
}

function emptyState(){
    return{
        daily:[],
        outletSales:[],
        skuSales:[],
        plans:[],
        incentives:[],
        tasks:[],
        incomePlans:[],
        customOutlets:{}
    };
}

function state(){
    try{
        return Object.assign(
            emptyState(),
            JSON.parse(localStorage.getItem(STORAGE)||'{}')
        );
    }catch{
        return emptyState();
    }
}

function save(s){
    localStorage.setItem(
        STORAGE,
        JSON.stringify(s)
    );
}

function user(id){
    return (D.users||[])
        .find(
            x=>
                String(x.id).toUpperCase()===
                String(id).toUpperCase()
        );
}

function salesUsers(){
    return (D.users||[])
        .filter(
            x=>
                x.role==='SR'||
                String(x.role).includes('MANAGER')
        );
}

function uid(){
    return session?.mode==='manager'
        ?managerView
        :session?.id;
}

function routeTarget(id){
    return Math.max(
        n(D.salaryRules?.minMonthlyTarget||50000),
        n(user(id)?.target)
    );
}

function daysInMonth(m){
    const[y,mo]=m.split('-').map(Number);
    return new Date(y,mo,0).getDate();
}

function daysRemain(m){

    const now=new Date();

    const[y,mo]=m
        .split('-')
        .map(Number);

    const end=
        new Date(y,mo,0);

    if(
        now.getFullYear()!==y||
        now.getMonth()+1!==mo
    ){
        return now>end
            ?0
            :daysInMonth(m);
    }

    return Math.max(
        1,
        end.getDate()-now.getDate()+1
    );
}

function monthName(m){

    const[y,mo]=m
        .split('-')
        .map(Number);

    return new Date(
        y,
        mo-1,
        1
    ).toLocaleDateString(
        'en-MY',
        {
            month:'long',
            year:'numeric'
        }
    );
}


/* =========================================================
   CLOUD
========================================================= */

function backendUrl(){
    return(
        localStorage.getItem(BACKEND)||''
    ).trim();
}

async function apiGet(
    action,
    targetId=uid(),
    month=selectedMonth
){

    const base=backendUrl();

    if(!base||!session)
        return null;

    const q=
        new URLSearchParams({
            action,
            staffId:session.id,
            password:session.password,
            viewStaffId:targetId,
            month
        });

    const r=
        await fetch(
            base+'?'+q.toString(),
            {
                cache:'no-store'
            }
        );

    return r.json();
}

async function apiPost(
    action,
    payload
){

    const base=backendUrl();

    if(!base||!session)
        return null;

    const r=
        await fetch(
            base,
            {
                method:'POST',
                headers:{
                    'Content-Type':
                        'text/plain;charset=utf-8'
                },
                body:JSON.stringify({
                    action,
                    staffId:session.id,
                    password:session.password,
                    payload
                })
            }
        );

    return r.json();
}

async function pushCloud(
    action,
    payload
){

    if(!backendUrl())
        return;

    try{

        const r=
            await apiPost(
                action,
                payload
            );

        if(!r?.ok)
            throw new Error(
                r?.error||
                'Cloud save failed'
            );

    }catch(e){

        console.warn(e);

        toast(
            'Saved on phone • cloud not connected'
        );
    }
}

function parseJSON(v,f=[]){

    try{

        return typeof v==='string'
            ?JSON.parse(v)
            :(v||f);

    }catch{

        return f;
    }
}

async function syncCloud(
    targetId=uid(),
    month=selectedMonth
){

    if(!backendUrl())
        return false;

    try{

        const r=
            await apiGet(
                'bootstrap',
                targetId,
                month
            );

        if(!r?.ok)
            throw new Error(
                r?.error||
                'Cloud read failed'
            );

        const d=r.data||{};
        const s=state();


        if(
            Array.isArray(d.outlets)&&
            d.outlets.length
        ){

            s.customOutlets[targetId]=
                d.outlets
                    .map(
                        x=>({
                            code:String(
                                x['Outlet Code']||''
                            ),
                            name:String(
                                x['Outlet Name']||''
                            ),
                            category:String(
                                x.Category||'Other'
                            ),
                            totalSku:n(
                                x['Total SKU']
                            )
                        })
                    )
                    .filter(x=>x.name);
        }


        s.daily=
            s.daily
                .filter(
                    x=>!(
                        x.staffId===targetId&&
                        x.month===month
                    )
                )
                .concat(
                    (d.daily||[])
                        .map(
                            x=>({
                                id:idGen(),
                                staffId:targetId,
                                month:String(
                                    x.Month||month
                                ),
                                date:String(
                                    x.Date||''
                                ).slice(0,10),
                                todaySales:n(
                                    x['Today Sales']
                                ),
                                lastMonthSameDay:n(
                                    x['Last Month Same Day']
                                ),
                                active:n(
                                    x.Active
                                ),
                                prepareTrip:n(
                                    x['Prepare for Trip']
                                ),
                                orderAmount:n(
                                    x['Order Amount']
                                ),
                                note:String(
                                    x.Note||''
                                )
                            })
                        )
                );


        s.outletSales=
            s.outletSales
                .filter(
                    x=>!(
                        x.staffId===targetId&&
                        x.month===month
                    )
                )
                .concat(
                    (d.outletSales||[])
                        .map(
                            x=>({
                                id:idGen(),
                                staffId:targetId,
                                month:String(
                                    x.Month||month
                                ),
                                date:String(
                                    x.Date||''
                                ).slice(0,10),
                                outletCode:String(
                                    x['Outlet Code']||''
                                ),
                                outletName:String(
                                    x['Outlet Name']||''
                                ),
                                sales:n(
                                    x['Sales Value']
                                ),
                                note:String(
                                    x.Note||''
                                )
                            })
                        )
                );


        s.skuSales=
            s.skuSales
                .filter(
                    x=>!(
                        x.staffId===targetId&&
                        x.month===month
                    )
                )
                .concat(
                    (d.skuSales||[])
                        .map(
                            x=>({
                                id:idGen(),
                                staffId:targetId,
                                month:String(
                                    x.Month||month
                                ),
                                date:String(
                                    x.Date||''
                                ).slice(0,10),
                                outletCode:String(
                                    x['Outlet Code']||''
                                ),
                                outletName:String(
                                    x['Outlet Name']||''
                                ),
                                skuName:String(
                                    x['SKU Name']||''
                                ),
                                cartons:n(
                                    x.Cartons
                                ),
                                salesValue:n(
                                    x['Sales Value']
                                )
                            })
                        )
                );


        s.plans=
            s.plans
                .filter(
                    x=>!(
                        x.staffId===targetId&&
                        x.month===month
                    )
                )
                .concat(
                    (d.plans||[])
                        .map(
                            x=>{

                                const raw=
                                    parseJSON(
                                        x['Targeted SKU List'],
                                        []
                                    );

                                const targetSkus=[];
                                const skuTargets={};

                                (
                                    Array.isArray(raw)
                                    ?raw
                                    :[]
                                ).forEach(
                                    it=>{

                                        if(
                                            typeof it===
                                            'string'
                                        ){

                                            targetSkus.push(
                                                it
                                            );

                                            skuTargets[it]={
                                                cartons:0,
                                                value:0
                                            };

                                        }else if(it?.name){

                                            targetSkus.push(
                                                it.name
                                            );

                                            skuTargets[it.name]={
                                                cartons:n(
                                                    it.cartons
                                                ),
                                                value:n(
                                                    it.value
                                                )
                                            };
                                        }
                                    }
                                );

                                return{
                                    id:idGen(),
                                    staffId:targetId,
                                    month:String(
                                        x.Month||month
                                    ),
                                    outletCode:String(
                                        x['Outlet Code']||''
                                    ),
                                    outletName:String(
                                        x['Outlet Name']||''
                                    ),
                                    outletTarget:n(
                                        x['Outlet Target']
                                    ),
                                    targetSkuCount:
                                        n(
                                            x['Targeted SKU Count']
                                        )||
                                        targetSkus.length,
                                    targetSkus,
                                    skuTargets
                                };
                            }
                        )
                );


        s.tasks=
            s.tasks
                .filter(
                    x=>
                        x.staffId!==targetId
                )
                .concat(
                    (d.tasks||[])
                        .map(
                            x=>({
                                id:String(
                                    x['Task ID']||
                                    idGen()
                                ),
                                staffId:targetId,
                                title:String(
                                    x.Title||''
                                ),
                                note:String(
                                    x.Instruction||''
                                ),
                                due:String(
                                    x['Due Date']||''
                                ).slice(0,10),
                                done:String(
                                    x.Status||''
                                ).toUpperCase()==='DONE',
                                createdAt:String(
                                    x['Created At']||''
                                )
                            })
                        )
                );


        if(
            Array.isArray(d.income)&&
            d.income.length
        ){

            const x=
                d.income[
                    d.income.length-1
                ];

            s.incomePlans=
                s.incomePlans
                    .filter(
                        y=>!(
                            y.staffId===targetId&&
                            y.month===month
                        )
                    );

            s.incomePlans.push({
                staffId:targetId,
                month,
                expected:n(
                    x['Expected Total Income']
                ),
                growthActual:n(
                    x['Growth Incentive Target']
                ),
                productManual:n(
                    x['Product Incentive Target']
                ),
                managerActual:n(
                    x['Manager Incentive Target']
                ),
                otherActual:n(
                    x['Other Incentive Target']
                )
            });
        }

        save(s);

        return true;

    }catch(e){

        console.warn(e);

        toast(
            'Cloud sync unavailable • local mode continues'
        );

        return false;
    }
}


/* =========================================================
   MASTER DATA
========================================================= */

function outletsFor(id){

    const s=state();

    const all=[
        ...(D.outlets?.[id]||[]),
        ...(s.customOutlets?.[id]||[])
    ];

    const m=new Map();

    all.forEach(
        o=>{

            const k=
                String(
                    o.code||
                    o.name||
                    ''
                )
                .trim()
                .toUpperCase();

            if(k)
                m.set(k,o);
        }
    );

    return[
        ...m.values()
    ].sort(
        (a,b)=>
            String(a.name)
                .localeCompare(
                    String(b.name)
                )
    );
}

function productsForOutlet(
    id,
    outletName
){

    const o=
        outletsFor(id)
            .find(
                x=>
                    x.name===outletName
            );

    const list=
        D.categoryProducts?.[
            o?.category
        ];

    return(
        Array.isArray(list)&&
        list.length
    )
        ?list
        :(D.products||[]);
}

function outletOptions(
    id,
    selected='',
    filter=''
){

    const q=
        filter
            .trim()
            .toLowerCase();

    const list=
        outletsFor(id)
            .filter(
                o=>
                    !q||
                    o.name
                        .toLowerCase()
                        .includes(q)||
                    String(
                        o.code||''
                    ).includes(q)
            );

    return(
        '<option value="">Select outlet</option>'+
        list
            .map(
                o=>`
                    <option
                        value="${esc(o.name)}"
                        ${
                            o.name===selected
                            ?'selected'
                            :''
                        }
                    >
                        ${esc(o.name)}
                    </option>
                `
            )
            .join('')
    );
}

function skuOptions(
    id,
    outletName,
    selected='',
    filter=''
){

    const q=
        filter
            .trim()
            .toLowerCase();

    const list=
        productsForOutlet(
            id,
            outletName
        )
        .filter(
            x=>
                !q||
                x.toLowerCase()
                    .includes(q)
        );

    return(
        '<option value="">Select SKU</option>'+
        list
            .map(
                x=>`
                    <option
                        value="${esc(x)}"
                        ${
                            x===selected
                            ?'selected'
                            :''
                        }
                    >
                        ${esc(x)}
                    </option>
                `
            )
            .join('')
    );
}


/* =========================================================
   PERFORMANCE DATA
========================================================= */

function monthDaily(
    id,
    m=selectedMonth
){

    return state()
        .daily
        .filter(
            x=>
                x.staffId===id&&
                x.month===m
        );
}

function monthOutletSales(
    id,
    m=selectedMonth
){

    return state()
        .outletSales
        .filter(
            x=>
                x.staffId===id&&
                x.month===m
        );
}

function monthSkuSales(
    id,
    m=selectedMonth
){

    return state()
        .skuSales
        .filter(
            x=>
                x.staffId===id&&
                x.month===m
        );
}

function monthPlans(
    id,
    m=selectedMonth
){

    return state()
        .plans
        .filter(
            x=>
                x.staffId===id&&
                x.month===m
        );
}

function outletAch(
    id,
    name,
    m=selectedMonth
){

    return monthOutletSales(
        id,
        m
    )
    .filter(
        x=>
            x.outletName===name
    )
    .reduce(
        (a,x)=>
            a+n(x.sales),
        0
    );
}

function skuAch(
    id,
    outlet,
    sku,
    m=selectedMonth
){

    const a=
        monthSkuSales(
            id,
            m
        )
        .filter(
            x=>
                x.outletName===outlet&&
                x.skuName===sku
        );

    return{
        cartons:
            a.reduce(
                (s,x)=>
                    s+n(x.cartons),
                0
            ),
        value:
            a.reduce(
                (s,x)=>
                    s+n(x.salesValue),
                0
            )
    };
}

function routeSkuAch(
    id,
    sku,
    m=selectedMonth
){

    const a=
        monthSkuSales(
            id,
            m
        )
        .filter(
            x=>
                x.skuName===sku
        );

    return{
        cartons:
            a.reduce(
                (s,x)=>
                    s+n(x.cartons),
                0
            ),
        value:
            a.reduce(
                (s,x)=>
                    s+n(x.salesValue),
                0
            )
    };
}

function metric(
    id,
    m=selectedMonth
){

    const daily=
        monthDaily(
            id,
            m
        )
        .slice()
        .sort(
            (a,b)=>
                String(a.date)
                    .localeCompare(
                        String(b.date)
                    )
        );

    const os=
        monthOutletSales(
            id,
            m
        );

    const ss=
        monthSkuSales(
            id,
            m
        );

    const plans=
        monthPlans(
            id,
            m
        );

    const target=
        routeTarget(id);

    const ach=
        daily.reduce(
            (a,x)=>
                a+n(x.todaySales),
            0
        );

    const short=
        Math.max(
            0,
            target-ach
        );

    const prev=
        daily.reduce(
            (a,x)=>
                a+n(
                    x.lastMonthSameDay
                ),
            0
        );

    const growth=
        prev
        ?(
            (ach-prev)/
            prev*
            100
        )
        :0;

    const last=
        daily[
            daily.length-1
        ]||{};

    const routeOutlets=
        outletsFor(id);

    const coveredKeys=
        new Set(
            os
                .filter(
                    x=>
                        n(x.sales)>0
                )
                .map(
                    x=>
                        String(
                            x.outletCode||
                            x.outletName
                        )
                        .trim()
                        .toUpperCase()
                )
        );

    const covered=
        routeOutlets
            .filter(
                o=>
                    coveredKeys
                        .has(
                            String(
                                o.code||
                                o.name
                            )
                            .trim()
                            .toUpperCase()
                        )
            );

    const zeroSales=
        routeOutlets
            .filter(
                o=>
                    !coveredKeys
                        .has(
                            String(
                                o.code||
                                o.name
                            )
                            .trim()
                            .toUpperCase()
                        )
            );

    return{
        daily,
        os,
        ss,
        plans,
        target,
        ach,
        short,
        prev,
        growth,
        active:n(last.active),
        trip:n(last.prepareTrip),
        order:n(last.orderAmount),
        routeOutlets,
        covered,
        zeroSales,
        coverage:
            routeOutlets.length
            ?covered.length/
                routeOutlets.length*
                100
            :0,
        required:
            daysRemain(m)
            ?short/daysRemain(m)
            :short,
        dailyTarget:
            target/
            daysInMonth(m),
        todaySales:
            daily
                .filter(
                    x=>
                        x.date===today()
                )
                .reduce(
                    (a,x)=>
                        a+n(
                            x.todaySales
                        ),
                    0
                )
    };
}


/* =========================================================
   SALARY
========================================================= */

function commission(
    ach,
    target
){

    const p=
        target
        ?ach/target
        :0;

    if(p<.8)
        return ach*.005;

    if(p<=1)
        return ach*.01;

    return(
        target*.01+
        (ach-target)*.02
    );
}

function incomePlan(
    id,
    m=selectedMonth
){

    return state()
        .incomePlans
        .find(
            x=>
                x.staffId===id&&
                x.month===m
        )||{
            staffId:id,
            month:m,
            expected:0,
            growthActual:0,
            productManual:0,
            managerActual:0,
            otherActual:0
        };
}

function productRules(
    id,
    m=selectedMonth
){

    return state()
        .incentives
        .filter(
            x=>
                x.staffId===id&&
                x.month===m&&
                x.type==='PRODUCT'
        );
}

function unlockedProduct(
    id,
    m=selectedMonth
){

    return productRules(
        id,
        m
    ).reduce(
        (a,i)=>
            a+(
                routeSkuAch(
                    id,
                    i.skuName,
                    m
                ).cartons>=
                n(i.targetQty)
                ?n(i.reward)
                :0
            ),
        0
    );
}

function incomeCalc(
    id,
    m=selectedMonth
){

    const mt=
        metric(
            id,
            m
        );

    const r=
        D.salaryRules||{};

    const p=
        incomePlan(
            id,
            m
        );

    const basic=
        n(r.basic||1700);

    const fuel=
        n(r.fuel||300);

    const rent=
        n(r.houseRent||250);

    const food=
        mt.ach>=
        n(
            r.foodThreshold||
            50000
        )
        ?n(r.foodHigh||250)
        :n(r.foodLow||100);

    let zero=0;

    if(
        mt.routeOutlets.length&&
        mt.zeroSales.length===0
    ){

        zero=
            (
                mt.ach/
                mt.target
            )>=.8
            ?n(r.zeroSalesHigh||200)
            :n(r.zeroSalesLow||100);
    }

    const comm=
        commission(
            mt.ach,
            mt.target
        );

    const product=
        unlockedProduct(
            id,
            m
        )+
        n(p.productManual);

    const growth=
        n(p.growthActual);

    const manager=
        n(p.managerActual);

    const other=
        n(p.otherActual);

    const total=
        basic+
        fuel+
        rent+
        food+
        zero+
        comm+
        product+
        growth+
        manager+
        other;

    return{
        basic,
        fuel,
        rent,
        food,
        zero,
        comm,
        product,
        growth,
        manager,
        other,
        total,
        expected:n(p.expected)
    };
}


/* =========================================================
   ALERTS
========================================================= */

function alerts(id){

    const mt=
        metric(id);

    const arr=[];

    if(mt.short>0){

        arr.push({
            bad:true,
            text:
                `Need ${money(mt.short)} more • `+
                `about ${money(mt.required)} per remaining day.`
        });

    }else{

        arr.push({
            text:
                'Monthly target achieved. Keep outlet coverage strong.'
        });
    }

    if(mt.zeroSales.length){

        arr.push({
            bad:true,
            text:
                `${mt.zeroSales.length} outlet(s) still have zero sales.`
        });
    }

    monthPlans(id)
        .forEach(
            p=>{

                const sf=
                    Math.max(
                        0,
                        n(
                            p.outletTarget
                        )-
                        outletAch(
                            id,
                            p.outletName
                        )
                    );

                if(sf){

                    arr.push({
                        bad:true,
                        text:
                            `${p.outletName}: ${money(sf)} short.`
                    });
                }

                (
                    p.targetSkus||
                    []
                ).forEach(
                    sku=>{

                        const t=
                            p.skuTargets?.[
                                sku
                            ]||{
                                cartons:0,
                                value:0
                            };

                        const a=
                            skuAch(
                                id,
                                p.outletName,
                                sku
                            );

                        const c=
                            Math.max(
                                0,
                                n(
                                    t.cartons
                                )-
                                a.cartons
                            );

                        const v=
                            Math.max(
                                0,
                                n(
                                    t.value
                                )-
                                a.value
                            );

                        if(c){

                            arr.push({
                                bad:true,
                                text:
                                    `${sku}: ${c} CTN left at ${p.outletName}.`
                            });

                        }else if(v){

                            arr.push({
                                bad:true,
                                text:
                                    `${sku}: ${money(v)} value left.`
                            });
                        }
                    }
                );
            }
        );

    state()
        .tasks
        .filter(
            t=>
                t.staffId===id&&
                !t.done
        )
        .forEach(
            t=>
                arr.push({
                    bad:true,
                    text:
                        `Task: ${t.title}`+
                        (
                            t.due
                            ?' • Due '+t.due
                            :''
                        )
                })
        );

    return arr.slice(
        0,
        10
    );
}

async function notifyAlerts(){

    if(
        !(
            'Notification'
            in window
        )
    ){

        toast(
            'Notification not supported'
        );

        return;
    }

    if(
        Notification.permission===
        'default'
    ){

        await Notification
            .requestPermission();
    }

    if(
        Notification.permission!==
        'granted'
    ){

        toast(
            'Notification permission not enabled'
        );

        return;
    }

    const a=
        alerts(
            uid()
        )
        .find(
            x=>x.bad
        );

    new Notification(
        'Sales Performance Hub',
        {
            body:
                a?.text||
                'No urgent alert right now.'
        }
    );
}


/* =========================================================
   LOGIN
========================================================= */

async function login(
    v,
    p
){

    const raw=
        String(v||'')
            .trim();

    const sid=
        raw.toLowerCase()==='manager'
        ?'M21954'
        :raw.toUpperCase();

    const u=
        user(sid);

    if(
        !u||
        String(p||'')
            .trim()
            .toUpperCase()!==sid
    ){

        toast(
            'Wrong Staff ID / Password'
        );

        return;
    }

    session={
        ...u,
        password:sid,
        mode:
            raw.toLowerCase()==='manager'
            ?'manager'
            :'sr'
    };

    managerView=
        'M21954';

    sessionStorage.setItem(
        SESSION,
        JSON.stringify(session)
    );

    openApp();

    if(backendUrl()){

        await syncCloud(
            uid(),
            selectedMonth
        );

        render();
    }
}

function logout(){

    sessionStorage
        .removeItem(
            SESSION
        );

    session=null;
    page='dashboard';

    $('#appView')
        ?.classList
        .add('hidden');

    $('#loginView')
        ?.classList
        .remove('hidden');

    if($('#loginPin'))
        $('#loginPin').value='';
}

function openApp(){

    $('#loginView')
        ?.classList
        .add('hidden');

    $('#appView')
        ?.classList
        .remove('hidden');

    refreshTop();

    render();
}

function refreshTop(){

    if(!session)
        return;

    const viewed=
        user(
            uid()
        );

    if($('#roleLabel')){

        $('#roleLabel')
            .textContent=
                session.mode==='manager'
                ?'MANAGER ACCESS • M21954'
                :`SALES REPRESENTATIVE • ${session.id}`;
    }

    if($('#welcomeName')){

        $('#welcomeName')
            .textContent=
                session.mode==='manager'
                ?`Manager • ${viewed?.name||uid()}`
                :session.name;
    }
}


/* =========================================================
   COMMON
========================================================= */

function monthBar(){

    return`
        <div class="monthbar">

            <label
                style="
                    margin:0;
                    flex:1;
                    min-width:145px
                "
            >
                Month

                <input
                    id="monthPick"
                    type="month"
                    value="${selectedMonth}"
                >
            </label>

            ${
                String(
                    session?.role
                ).includes('MANAGER')

                ?`
                    <div
                        class="mode-toggle"
                        style="
                            flex:1;
                            min-width:190px
                        "
                    >

                        <button
                            id="srMode"
                            class="${
                                session.mode==='sr'
                                ?'active'
                                :''
                            }"
                        >
                            My SR
                        </button>

                        <button
                            id="mgrMode"
                            class="${
                                session.mode==='manager'
                                ?'active'
                                :''
                            }"
                        >
                            Manager
                        </button>

                    </div>
                `
                :''
            }

        </div>

        ${
            session?.mode==='manager'

            ?`
                <div
                    class="card"
                    style="margin-bottom:12px"
                >

                    <label>
                        View Sales Representative

                        <select id="managerPick">

                            ${
                                salesUsers()
                                    .map(
                                        u=>`
                                            <option
                                                value="${u.id}"
                                                ${
                                                    uid()===u.id
                                                    ?'selected'
                                                    :''
                                                }
                                            >
                                                ${esc(u.name)}
                                                •
                                                ${u.id}
                                            </option>
                                        `
                                    )
                                    .join('')
                            }

                        </select>
                    </label>

                </div>
            `
            :''
        }
    `;
}

function bindCommon(){

    if($('#monthPick')){

        $('#monthPick')
            .onchange=
                async e=>{

                    selectedMonth=
                        e.target.value;

                    if(backendUrl()){

                        await syncCloud(
                            uid(),
                            selectedMonth
                        );
                    }

                    render();
                };
    }

    if($('#srMode')){

        $('#srMode')
            .onclick=
                ()=>{

                    session.mode='sr';

                    managerView=
                        session.id;

                    page=
                        'dashboard';

                    refreshTop();
                    render();
                };
    }

    if($('#mgrMode')){

        $('#mgrMode')
            .onclick=
                ()=>{

                    session.mode=
                        'manager';

                    managerView=
                        'M21954';

                    page=
                        'team';

                    refreshTop();
                    render();
                };
    }

    if($('#managerPick')){

        $('#managerPick')
            .onchange=
                async e=>{

                    managerView=
                        e.target.value;

                    refreshTop();

                    if(backendUrl()){

                        await syncCloud(
                            uid(),
                            selectedMonth
                        );
                    }

                    render();
                };
    }

    $$('[data-go]')
        .forEach(
            b=>
                b.onclick=
                    ()=>{

                        page=
                            b.dataset.go;

                        render();
                    }
        );
}

function kpi(
    l,
    v,
    s,
    c=''
){

    return`
        <div class="kpi">

            <div class="label">
                ${esc(l)}
            </div>

            <div class="value ${c}">
                ${esc(v)}
            </div>

            <div class="sub">
                ${esc(s)}
            </div>

        </div>
    `;
}

function render(){

    if(!session)
        return;

    $$('#bottomNav button[data-page]')
        .forEach(
            b=>
                b.classList.toggle(
                    'active',
                    b.dataset.page===
                    (
                        [
                            'tasks',
                            'zero',
                            'sku',
                            'team'
                        ].includes(page)
                        ?'dashboard'
                        :page
                    )
                )
        );

    (
        {
            dashboard:renderDashboard,
            daily:renderDaily,
            planning:renderPlanning,
            income:renderIncome,
            summary:renderSummary,
            tasks:renderTasks,
            zero:renderZero,
            sku:renderSku,
            team:renderTeam
        }[page]||
        renderDashboard
    )();
}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard(){

    const id=
        uid();

    const u=
        user(id);

    const m=
        metric(id);

    const pct=
        m.target
        ?m.ach/m.target*100
        :0;

    const a=
        alerts(id);

    const inc=
        incomeCalc(id);

    $('#mainContent')
        .innerHTML=`

        ${monthBar()}

        <section class="hero">

            <p class="eyebrow">
                ${monthName(selectedMonth).toUpperCase()}
            </p>

            <h3>
                ${esc(u?.name||id)}
            </h3>

            <p class="muted">
                ${money(m.ach)}
                achieved from
                ${money(m.target)}
                target.
            </p>

            <div class="progress-wrap">

                <div
                    class="
                        progress
                        ${
                            pct>=100
                            ?'goodbar'
                            :''
                        }
                    "
                    style="
                        width:${Math.min(100,pct)}%
                    "
                >
                </div>

            </div>

            <div
                class="row"
                style="margin-top:8px"
            >

                <small class="muted">
                    ${money(m.short)}
                    remaining
                </small>

                <strong>
                    ${pct.toFixed(1)}%
                </strong>

            </div>

        </section>


        <div class="grid kpi-grid">

            ${kpi(
                'TARGET',
                money(m.target),
                'Monthly route target'
            )}

            ${kpi(
                'ACHIEVEMENT',
                money(m.ach),
                'Month-to-date',
                m.ach>=m.target
                ?'good'
                :''
            )}

            ${kpi(
                'SHORTFALL',
                money(m.short),
                'Remaining',
                m.short
                ?'bad'
                :'good'
            )}

            ${kpi(
                'NEED / DAY',
                money(m.required),
                `${daysRemain(selectedMonth)} day(s) left`,
                m.short
                ?'warn'
                :'good'
            )}

            ${kpi(
                'TODAY SALES',
                money(m.todaySales),
                'Today entered'
            )}

            ${kpi(
                'GROWTH',
                `${m.growth>=0?'+':''}${m.growth.toFixed(1)}%`,
                `Last month comparable ${money(m.prev)}`,
                m.growth>=0
                ?'good'
                :'bad'
            )}

            ${kpi(
                'OUTLET COVERAGE',
                `${m.coverage.toFixed(0)}%`,
                `${m.covered.length}/${m.routeOutlets.length} outlets`,
                m.coverage>=100
                ?'good'
                :'bad'
            )}

            ${kpi(
                'PROJECTED SALARY',
                money(inc.total),
                'Salary + current incentives'
            )}

        </div>


        <div class="section-title">
            <h3>
                Quick Actions
            </h3>
        </div>


        <div class="mini-grid">

            <button
                class="btn secondary"
                data-go="daily"
            >
                ➕ Add Sales
            </button>

            <button
                class="btn secondary"
                data-go="planning"
            >
                🎯 Monthly Plan
            </button>

            <button
                class="btn secondary"
                data-go="zero"
            >
                🏪 Zero Sales
            </button>

            <button
                class="btn secondary"
                data-go="sku"
            >
                📦 SKU Performance
            </button>

            <button
                class="btn secondary"
                data-go="tasks"
            >
                ✅ Tasks
            </button>

            ${
                session.mode==='manager'

                ?`
                    <button
                        class="btn secondary"
                        data-go="team"
                    >
                        👥 Team Control
                    </button>
                `
                :''
            }

        </div>


        <div class="section-title">
            <h3>
                Smart Alerts
            </h3>
        </div>


        <div class="card">

            ${
                a.length

                ?a
                    .map(
                        x=>`
                            <div
                                class="
                                    alert-card
                                    ${
                                        x.bad
                                        ?''
                                        :'goodalert'
                                    }
                                "
                            >
                                ${esc(x.text)}
                            </div>
                        `
                    )
                    .join('')

                :`
                    <div class="empty">
                        No alert
                    </div>
                `
            }

            <button
                id="notifyBtn2"
                class="btn secondary"
                style="margin-top:8px"
            >
                🔔 Enable / Test Notification
            </button>

        </div>
    `;

    bindCommon();

    $('#notifyBtn2')
        .onclick=
            notifyAlerts;
}


/* =========================================================
   DAILY UPDATE
========================================================= */

function renderDaily(){

    const id=
        uid();

    if(
        session.mode===
        'manager'
    ){

        $('#mainContent')
            .innerHTML=`

            ${monthBar()}

            <div class="card">

                <p class="eyebrow">
                    MANAGER MODE
                </p>

                <h2>
                    Entry is locked
                </h2>

                <p class="muted">

                    Use Manager mode only
                    to review the team.

                    Switch to My SR
                    to enter your own sales.

                </p>

            </div>
        `;

        bindCommon();

        return;
    }

    const recent=
        monthOutletSales(id)
            .slice()
            .sort(
                (a,b)=>
                    String(b.date)
                        .localeCompare(
                            String(a.date)
                        )
            )
            .slice(0,8);

    $('#mainContent')
        .innerHTML=`

        ${monthBar()}


        <div class="card">

            <p class="eyebrow">
                STEP 1 • DAILY TOTAL
            </p>

            <h2>
                Daily Route Summary
            </h2>

            <p class="muted">

                Enter the total route sales
                for the day.

                This drives target achievement.

            </p>


            <form
                id="dailyForm"
                class="stack"
            >

                <label>

                    Date

                    <input
                        name="date"
                        type="date"
                        value="${today()}"
                        required
                    >

                </label>


                <label>

                    Today Total Sales (RM)

                    <input
                        name="todaySales"
                        type="number"
                        min="0"
                        step="0.01"
                        inputmode="decimal"
                        value="0"
                        required
                    >

                </label>


                <label>

                    Last Month Same Day (RM)

                    <input
                        name="lastMonthSameDay"
                        type="number"
                        min="0"
                        step="0.01"
                        inputmode="decimal"
                        value="0"
                    >

                </label>


                <div class="form-grid">

                    <label>

                        Active (RM)

                        <input
                            name="active"
                            type="number"
                            min="0"
                            step="0.01"
                            inputmode="decimal"
                            value="0"
                        >

                    </label>


                    <label>

                        Prepare for Trip (RM)

                        <input
                            name="prepareTrip"
                            type="number"
                            min="0"
                            step="0.01"
                            inputmode="decimal"
                            value="0"
                        >

                    </label>

                </div>


                <label>

                    Order Amount (RM)

                    <input
                        name="orderAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        inputmode="decimal"
                        value="0"
                    >

                </label>


                <label>

                    Note

                    <textarea
                        name="note"
                        placeholder="Optional"
                    ></textarea>

                </label>


                <button
                    class="btn primary"
                >
                    SAVE DAILY TOTAL
                </button>

            </form>

        </div>


        <div
            class="card"
            style="margin-top:12px"
        >

            <p class="eyebrow">
                STEP 2 • OUTLET & SKU
            </p>

            <h2>
                What Did You Sell?
            </h2>

            <p class="muted">

                Find your outlet,
                enter outlet sales,
                then add SKU if needed.

            </p>


            <form
                id="saleForm"
                class="stack"
            >

                <label>

                    Date

                    <input
                        name="date"
                        type="date"
                        value="${today()}"
                        required
                    >

                </label>


                <label>

                    Search Outlet

                    <input
                        id="outletSearch"
                        placeholder="Type outlet name or code"
                    >

                </label>


                <label>

                    Select Outlet

                    <select
                        id="outletSel"
                        name="outlet"
                        required
                    >
                        ${outletOptions(id)}
                    </select>

                </label>


                <label>

                    Outlet Sales (RM)

                    <input
                        name="sales"
                        type="number"
                        min="0"
                        step="0.01"
                        inputmode="decimal"
                        value="0"
                        required
                    >

                </label>


                <div
                    class="card"
                    style="
                        padding:12px;
                        background:#0a0d11
                    "
                >

                    <p
                        class="eyebrow"
                        style="margin-top:0"
                    >
                        OPTIONAL SKU DETAIL
                    </p>


                    <label>

                        Search SKU

                        <input
                            id="skuSearch"
                            placeholder="Type basil, noodles, biscuit..."
                        >

                    </label>


                    <label>

                        Select SKU

                        <select
                            id="skuSel"
                            name="skuName"
                        >
                            <option value="">
                                Select outlet first
                            </option>
                        </select>

                    </label>


                    <div class="form-grid">

                        <label>

                            Cartons Sold

                            <input
                                name="cartons"
                                type="number"
                                min="0"
                                step="1"
                                inputmode="numeric"
                                value="0"
                            >

                        </label>


                        <label>

                            SKU Sales Value (RM)

                            <input
                                name="skuValue"
                                type="number"
                                min="0"
                                step="0.01"
                                inputmode="decimal"
                                value="0"
                            >

                        </label>

                    </div>

                </div>


                <label>

                    Note

                    <textarea
                        name="note"
                        placeholder="Optional"
                    ></textarea>

                </label>


                <button
                    class="btn primary"
                >
                    SAVE OUTLET / SKU SALE
                </button>

            </form>

        </div>


        <div class="section-title">

            <h3>
                Recent Outlet Entries
            </h3>

        </div>


        <div class="list">

            ${
                recent.length

                ?recent
                    .map(
                        x=>`
                            <div class="list-item">

                                <div class="row">

                                    <div>

                                        <h4>
                                            ${esc(x.outletName)}
                                        </h4>

                                        <p>
                                            ${esc(x.date)}
                                            •
                                            ${money(x.sales)}
                                        </p>

                                    </div>

                                    <span class="pill green">
                                        SAVED
                                    </span>

                                </div>

                            </div>
                        `
                    )
                    .join('')

                :`
                    <div class="empty">
                        No outlet entry yet.
                    </div>
                `
            }

        </div>
    `;

    bindCommon();

    const oSearch=
        $('#outletSearch');

    const oSel=
        $('#outletSel');

    const sSearch=
        $('#skuSearch');

    const sSel=
        $('#skuSel');


    function refreshOutlets(){

        const before=
            oSel.value;

        oSel.innerHTML=
            outletOptions(
                id,
                before,
                oSearch.value
            );

        if(
            before&&
            [...oSel.options]
                .some(
                    o=>
                        o.value===before
                )
        ){

            oSel.value=
                before;
        }

        refreshSkus();
    }


    function refreshSkus(){

        const before=
            sSel.value;

        if(!oSel.value){

            sSel.innerHTML=
                '<option value="">Select outlet first</option>';

            return;
        }

        sSel.innerHTML=
            skuOptions(
                id,
                oSel.value,
                before,
                sSearch.value
            );

        if(
            before&&
            [...sSel.options]
                .some(
                    o=>
                        o.value===before
                )
        ){

            sSel.value=
                before;
        }
    }


    oSearch.oninput=
        refreshOutlets;


    oSel.onchange=
        ()=>{

            sSearch.value='';

            refreshSkus();
        };


    sSearch.oninput=
        refreshSkus;


    refreshSkus();


    $('#dailyForm')
        .onsubmit=
            e=>{

                e.preventDefault();

                const fd=
                    new FormData(
                        e.target
                    );

                const date=
                    String(
                        fd.get('date')
                    );

                const month=
                    date.slice(
                        0,
                        7
                    );

                const s=
                    state();

                s.daily=
                    s.daily
                        .filter(
                            x=>!(
                                x.staffId===id&&
                                x.date===date
                            )
                        );

                const rec={
                    id:idGen(),
                    staffId:id,
                    month,
                    date,
                    todaySales:n(
                        fd.get(
                            'todaySales'
                        )
                    ),
                    lastMonthSameDay:n(
                        fd.get(
                            'lastMonthSameDay'
                        )
                    ),
                    active:n(
                        fd.get(
                            'active'
                        )
                    ),
                    prepareTrip:n(
                        fd.get(
                            'prepareTrip'
                        )
                    ),
                    orderAmount:n(
                        fd.get(
                            'orderAmount'
                        )
                    ),
                    note:String(
                        fd.get(
                            'note'
                        )||''
                    )
                };

                s.daily.push(
                    rec
                );

                save(s);

                selectedMonth=
                    month;

                pushCloud(
                    'saveDaily',
                    rec
                );

                toast(
                    `Saved ${money(rec.todaySales)} for ${date}`
                );

                render();
            };


    $('#saleForm')
        .onsubmit=
            e=>{

                e.preventDefault();

                const fd=
                    new FormData(
                        e.target
                    );

                const date=
                    String(
                        fd.get('date')
                    );

                const month=
                    date.slice(
                        0,
                        7
                    );

                const outletName=
                    String(
                        fd.get(
                            'outlet'
                        )||''
                    );

                const o=
                    outletsFor(id)
                        .find(
                            x=>
                                x.name===outletName
                        );

                if(!o){

                    toast(
                        'Please select an outlet'
                    );

                    return;
                }

                const s=
                    state();

                const outRec={
                    id:idGen(),
                    staffId:id,
                    month,
                    date,
                    outletCode:
                        o.code||'',
                    outletName,
                    sales:n(
                        fd.get(
                            'sales'
                        )
                    ),
                    note:String(
                        fd.get(
                            'note'
                        )||''
                    )
                };

                s.outletSales.push(
                    outRec
                );

                const skuName=
                    String(
                        fd.get(
                            'skuName'
                        )||''
                    ).trim();

                let skuRec=null;

                if(skuName){

                    skuRec={
                        id:idGen(),
                        staffId:id,
                        month,
                        date,
                        outletCode:
                            o.code||'',
                        outletName,
                        skuName,
                        cartons:n(
                            fd.get(
                                'cartons'
                            )
                        ),
                        salesValue:n(
                            fd.get(
                                'skuValue'
                            )
                        )
                    };

                    s.skuSales.push(
                        skuRec
                    );
                }

                save(s);

                selectedMonth=
                    month;

                pushCloud(
                    'saveOutlet',
                    outRec
                );

                if(skuRec){

                    pushCloud(
                        'saveSku',
                        skuRec
                    );
                }

                toast(
                    skuRec
                    ?`Saved ${o.name} • ${skuName}`
                    :`Saved ${o.name} • ${money(outRec.sales)}`
                );

                render();
            };
}


/* =========================================================
   PLANNING
========================================================= */

function renderPlanning(){

    const id=
        uid();

    const plans=
        monthPlans(id);

    if(
        session.mode===
        'manager'
    ){

        $('#mainContent')
            .innerHTML=`

            ${monthBar()}

            <div class="card">

                <p class="eyebrow">
                    MANAGER REVIEW
                </p>

                <h2>
                    Monthly Planning
                </h2>

                ${planningHtml(id)}

            </div>
        `;

        bindCommon();

        return;
    }


    $('#mainContent')
        .innerHTML=`

        ${monthBar()}


        <div class="card">

            <p class="eyebrow">
                ROUTE TARGET
            </p>

            <h2>
                ${money(routeTarget(id))}
            </h2>

            <p class="muted">

                Choose an outlet and set
                its monthly target.

                Then choose targeted SKUs
                and carton/value targets.

            </p>

        </div>


        <div
            class="card"
            style="margin-top:12px"
        >

            <form
                id="planForm"
                class="stack"
            >

                <label>

                    Search Outlet

                    <input
                        id="planOutletSearch"
                        placeholder="Type outlet name or code"
                    >

                </label>


                <label>

                    Select Outlet

                    <select
                        id="planOutlet"
                        name="outlet"
                        required
                    >
                        ${outletOptions(id)}
                    </select>

                </label>


                <label>

                    Outlet Monthly Target (RM)

                    <input
                        name="outletTarget"
                        type="number"
                        min="0"
                        step="0.01"
                        inputmode="decimal"
                        value="0"
                        required
                    >

                </label>


                <label>

                    How Many SKUs to Target?

                    <input
                        id="targetSkuCount"
                        name="targetSkuCount"
                        type="number"
                        min="0"
                        step="1"
                        inputmode="numeric"
                        value="0"
                    >

                </label>


                <label>

                    Search SKU

                    <input
                        id="planSkuSearch"
                        placeholder="Type product name"
                    >

                </label>


                <label>

                    Select SKU

                    <select id="planSkuSelect">

                        <option value="">
                            Select outlet first
                        </option>

                    </select>

                </label>


                <button
                    type="button"
                    id="addSkuBtn"
                    class="btn secondary"
                >
                    + ADD SELECTED SKU
                </button>


                <div
                    id="chosenSkus"
                    class="chipbox"
                >
                </div>


                <div
                    id="skuTargetInputs"
                    class="list"
                >
                </div>


                <button
                    class="btn primary"
                >
                    SAVE MONTHLY PLAN
                </button>

            </form>

        </div>


        <div class="section-title">

            <h3>
                Plan vs Achievement
            </h3>

        </div>


        ${planningHtml(id)}
    `;

    bindCommon();

    selectedSkus=[];

    const oSearch=
        $('#planOutletSearch');

    const oSel=
        $('#planOutlet');

    const q=
        $('#planSkuSearch');

    const skuSel=
        $('#planSkuSelect');

    const chips=
        $('#chosenSkus');

    const inputs=
        $('#skuTargetInputs');


    function refreshPlanOutlets(){

        const before=
            oSel.value;

        oSel.innerHTML=
            outletOptions(
                id,
                before,
                oSearch.value
            );

        if(
            before&&
            [...oSel.options]
                .some(
                    o=>
                        o.value===before
                )
        ){

            oSel.value=
                before;
        }

        refreshPlanSkus();
    }


    function refreshPlanSkus(){

        const before=
            skuSel.value;

        if(!oSel.value){

            skuSel.innerHTML=
                '<option value="">Select outlet first</option>';

            return;
        }

        const list=
            productsForOutlet(
                id,
                oSel.value
            )
            .filter(
                x=>
                    (
                        !q.value||
                        x.toLowerCase()
                            .includes(
                                q.value.toLowerCase()
                            )
                    )&&
                    !selectedSkus.includes(x)
            );

        skuSel.innerHTML=
            '<option value="">Select SKU</option>'+
            list
                .map(
                    x=>`
                        <option value="${esc(x)}">
                            ${esc(x)}
                        </option>
                    `
                )
                .join('');

        if(
            before&&
            list.includes(before)
        ){

            skuSel.value=
                before;
        }
    }


    function paintSelected(){

        const cache={};

        selectedSkus
            .forEach(
                sku=>{

                    cache[sku]={
                        cartons:n(
                            document.querySelector(
                                `[data-c="${CSS.escape(sku)}"]`
                            )?.value
                        ),
                        value:n(
                            document.querySelector(
                                `[data-v="${CSS.escape(sku)}"]`
                            )?.value
                        )
                    };
                }
            );

        chips.innerHTML=
            selectedSkus
                .map(
                    sku=>`
                        <span class="chip">

                            ${esc(sku)}

                            <button
                                type="button"
                                data-rm="${esc(sku)}"
                            >
                                ×
                            </button>

                        </span>
                    `
                )
                .join('');


        inputs.innerHTML=
            selectedSkus
                .map(
                    (sku,i)=>`
                        <div class="list-item">

                            <h4>
                                ${i+1}. ${esc(sku)}
                            </h4>

                            <div
                                class="form-grid"
                                style="margin-top:8px"
                            >

                                <label>

                                    Target Cartons

                                    <input
                                        data-c="${esc(sku)}"
                                        type="number"
                                        min="0"
                                        step="1"
                                        value="${cache[sku]?.cartons||0}"
                                    >

                                </label>


                                <label>

                                    Target Sales Value (RM)

                                    <input
                                        data-v="${esc(sku)}"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value="${cache[sku]?.value||0}"
                                    >

                                </label>

                            </div>

                        </div>
                    `
                )
                .join('');
    }


    oSearch.oninput=
        refreshPlanOutlets;


    oSel.onchange=
        ()=>{

            q.value='';

            selectedSkus=[];

            paintSelected();

            refreshPlanSkus();
        };


    q.oninput=
        refreshPlanSkus;


    $('#addSkuBtn')
        .onclick=
            ()=>{

                const sku=
                    skuSel.value;

                if(!sku){

                    toast(
                        'Select a SKU'
                    );

                    return;
                }

                const max=
                    n(
                        $('#targetSkuCount')
                            .value
                    );

                if(
                    max&&
                    selectedSkus.length>=max
                ){

                    toast(
                        `Maximum ${max} SKU(s)`
                    );

                    return;
                }

                if(
                    !selectedSkus
                        .includes(sku)
                ){

                    selectedSkus
                        .push(sku);
                }

                paintSelected();

                q.value='';

                refreshPlanSkus();
            };


    chips.onclick=
        e=>{

            const b=
                e.target
                    .closest(
                        '[data-rm]'
                    );

            if(!b)
                return;

            selectedSkus=
                selectedSkus
                    .filter(
                        x=>
                            x!==b.dataset.rm
                    );

            paintSelected();

            refreshPlanSkus();
        };


    refreshPlanSkus();


    $('#planForm')
        .onsubmit=
            e=>{

                e.preventDefault();

                const fd=
                    new FormData(
                        e.target
                    );

                const outletName=
                    String(
                        fd.get(
                            'outlet'
                        )||''
                    );

                const o=
                    outletsFor(id)
                        .find(
                            x=>
                                x.name===outletName
                        );

                const cnt=
                    n(
                        fd.get(
                            'targetSkuCount'
                        )
                    );

                if(!o){

                    toast(
                        'Select an outlet'
                    );

                    return;
                }

                if(
                    cnt&&
                    selectedSkus.length!==cnt
                ){

                    toast(
                        `Please add exactly ${cnt} SKU(s)`
                    );

                    return;
                }


                const skuTargets={};

                selectedSkus
                    .forEach(
                        sku=>{

                            skuTargets[sku]={
                                cartons:n(
                                    document
                                        .querySelector(
                                            `[data-c="${CSS.escape(sku)}"]`
                                        )
                                        ?.value
                                ),
                                value:n(
                                    document
                                        .querySelector(
                                            `[data-v="${CSS.escape(sku)}"]`
                                        )
                                        ?.value
                                )
                            };
                        }
                    );


                const rec={
                    id:idGen(),
                    staffId:id,
                    month:selectedMonth,
                    outletCode:
                        o.code||'',
                    outletName,
                    outletTarget:n(
                        fd.get(
                            'outletTarget'
                        )
                    ),
                    targetSkuCount:
                        cnt||
                        selectedSkus.length,
                    targetSkus:[
                        ...selectedSkus
                    ],
                    skuTargets
                };


                const s=
                    state();


                s.plans=
                    s.plans
                        .filter(
                            x=>!(
                                x.staffId===id&&
                                x.month===selectedMonth&&
                                x.outletName===outletName
                            )
                        );


                s.plans.push(
                    rec
                );

                save(s);


                pushCloud(
                    'savePlan',
                    {
                        month:
                            selectedMonth,
                        routeTarget:
                            routeTarget(id),
                        outletCode:
                            rec.outletCode,
                        outletName:
                            rec.outletName,
                        outletTarget:
                            rec.outletTarget,
                        targetedSkuCount:
                            rec.targetSkuCount,
                        targetSkus:
                            rec.targetSkus
                                .map(
                                    name=>({
                                        name,
                                        ...rec.skuTargets[name]
                                    })
                                ),
                        skuSalesPlan:
                            rec.targetSkus
                                .reduce(
                                    (a,name)=>
                                        a+n(
                                            rec.skuTargets[
                                                name
                                            ]?.value
                                        ),
                                    0
                                )
                    }
                );

                toast(
                    'Monthly plan saved'
                );

                render();
            };
}


function planningHtml(id){

    const plans=
        monthPlans(id);

    if(!plans.length){

        return`
            <div class="card">

                <div class="empty">
                    No monthly plan yet.
                </div>

            </div>
        `;
    }

    return`
        <div class="list">

            ${
                plans
                    .map(
                        p=>{

                            const actual=
                                outletAch(
                                    id,
                                    p.outletName
                                );

                            const short=
                                Math.max(
                                    0,
                                    n(
                                        p.outletTarget
                                    )-
                                    actual
                                );

                            const pct=
                                n(
                                    p.outletTarget
                                )
                                ?Math.min(
                                    100,
                                    actual/
                                    n(
                                        p.outletTarget
                                    )*
                                    100
                                )
                                :0;

                            return`
                                <div class="card">

                                    <div class="row">

                                        <div>

                                            <h3
                                                style="margin:0"
                                            >
                                                ${esc(p.outletName)}
                                            </h3>

                                            <p
                                                class="muted"
                                                style="margin:4px 0 0"
                                            >
                                                ${
                                                    (
                                                        p.targetSkus||
                                                        []
                                                    ).length
                                                }
                                                targeted SKU(s)
                                            </p>

                                        </div>


                                        <span
                                            class="
                                                pill
                                                ${
                                                    short
                                                    ?'red'
                                                    :'green'
                                                }
                                            "
                                        >
                                            ${
                                                short
                                                ?money(short)+' short'
                                                :'Achieved'
                                            }
                                        </span>

                                    </div>


                                    <div
                                        class="progress-wrap"
                                        style="margin-top:10px"
                                    >

                                        <div
                                            class="
                                                progress
                                                ${
                                                    pct>=100
                                                    ?'goodbar'
                                                    :''
                                                }
                                            "
                                            style="
                                                width:${pct}%
                                            "
                                        >
                                        </div>

                                    </div>


                                    ${
                                        (
                                            p.targetSkus||
                                            []
                                        )
                                        .map(
                                            sku=>{

                                                const t=
                                                    p.skuTargets?.[
                                                        sku
                                                    ]||{
                                                        cartons:0,
                                                        value:0
                                                    };

                                                const a=
                                                    skuAch(
                                                        id,
                                                        p.outletName,
                                                        sku
                                                    );

                                                const lc=
                                                    Math.max(
                                                        0,
                                                        n(
                                                            t.cartons
                                                        )-
                                                        a.cartons
                                                    );

                                                const lv=
                                                    Math.max(
                                                        0,
                                                        n(
                                                            t.value
                                                        )-
                                                        a.value
                                                    );

                                                return`
                                                    <div
                                                        class="list-item"
                                                        style="margin-top:8px"
                                                    >

                                                        <h4>
                                                            ${esc(sku)}
                                                        </h4>

                                                        <p>

                                                            CTN
                                                            ${a.cartons}
                                                            /
                                                            ${n(t.cartons)}

                                                            •

                                                            <span
                                                                class="${
                                                                    lc
                                                                    ?'bad'
                                                                    :'good'
                                                                }"
                                                            >
                                                                ${lc} left
                                                            </span>

                                                            <br>

                                                            Value
                                                            ${money(a.value)}
                                                            /
                                                            ${money(t.value)}

                                                            •

                                                            <span
                                                                class="${
                                                                    lv
                                                                    ?'bad'
                                                                    :'good'
                                                                }"
                                                            >
                                                                ${money(lv)} left
                                                            </span>

                                                        </p>

                                                    </div>
                                                `;
                                            }
                                        )
                                        .join('')
                                    }

                                </div>
                            `;
                        }
                    )
                    .join('')
            }

        </div>
    `;
}


/* =========================================================
   INCOME
========================================================= */

function renderIncome(){

    const id=
        uid();

    const s=
        incomeCalc(id);

    const p=
        incomePlan(id);

    const rules=
        productRules(id);

    $('#mainContent')
        .innerHTML=`

        ${monthBar()}


        <div class="card">

            <p class="eyebrow">
                PROJECTED INCOME
            </p>

            <div class="salary-total">
                ${money(s.total)}
            </div>

            <p class="muted">

                ${
                    s.expected

                    ?`
                        Expected
                        ${money(s.expected)}
                        •

                        ${
                            s.total>=s.expected
                            ?'Goal achieved'
                            :money(
                                s.expected-
                                s.total
                            )+
                            ' remaining'
                        }
                    `

                    :'Set expected income below.'
                }

            </p>

        </div>


        <div
            class="card"
            style="margin-top:12px"
        >

            ${incomeRow(
                'Basic Salary',
                s.basic
            )}

            ${incomeRow(
                'Fuel / Oil',
                s.fuel
            )}

            ${incomeRow(
                'House Rent',
                s.rent
            )}

            ${incomeRow(
                'Food Allowance',
                s.food
            )}

            ${incomeRow(
                'Sales Commission',
                s.comm
            )}

            ${incomeRow(
                'Zero Sales Incentive',
                s.zero
            )}

            ${incomeRow(
                'Product Incentive',
                s.product
            )}

            ${incomeRow(
                'Growth Incentive',
                s.growth
            )}

            ${incomeRow(
                'Manager Incentive',
                s.manager
            )}

            ${incomeRow(
                'Other Incentive',
                s.other
            )}


            <hr
                style="
                    border:0;
                    border-top:1px solid var(--line);
                    margin:14px 0
                "
            >


            ${incomeRow(
                'TOTAL PROJECTED',
                s.total,
                true
            )}

        </div>


        <div
            class="card"
            style="margin-top:12px"
        >

            <form
                id="incomeForm"
                class="stack"
            >

                <label>

                    Expected Total Income (RM)

                    <input
                        name="expected"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${n(p.expected)}"
                    >

                </label>


                <label>

                    Growth Incentive Actual (RM)

                    <input
                        name="growthActual"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${n(p.growthActual)}"
                    >

                </label>


                <label>

                    Manual Product Incentive (RM)

                    <input
                        name="productManual"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${n(p.productManual)}"
                    >

                </label>


                <label>

                    Manager Incentive Actual (RM)

                    <input
                        name="managerActual"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${n(p.managerActual)}"
                    >

                </label>


                <label>

                    Other Incentive Actual (RM)

                    <input
                        name="otherActual"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${n(p.otherActual)}"
                    >

                </label>


                <button class="btn primary">
                    SAVE INCOME DETAILS
                </button>

            </form>

        </div>


        ${
            session.mode==='manager'

            ?`
                <div
                    class="card"
                    style="margin-top:12px"
                >

                    <p class="eyebrow">
                        PRODUCT INCENTIVE RULE
                    </p>

                    <form
                        id="incForm"
                        class="stack"
                    >

                        <label>

                            SKU

                            <select name="skuName">

                                ${
                                    (
                                        D.products||
                                        []
                                    )
                                    .map(
                                        x=>`
                                            <option
                                                value="${esc(x)}"
                                            >
                                                ${esc(x)}
                                            </option>
                                        `
                                    )
                                    .join('')
                                }

                            </select>

                        </label>


                        <label>

                            Target Cartons

                            <input
                                name="targetQty"
                                type="number"
                                min="1"
                                step="1"
                                required
                            >

                        </label>


                        <label>

                            Reward RM

                            <input
                                name="reward"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                            >

                        </label>


                        <button class="btn primary">
                            CREATE INCENTIVE
                        </button>

                    </form>

                </div>
            `
            :''
        }


        <div class="section-title">

            <h3>
                Product Incentive Progress
            </h3>

        </div>


        <div class="list">

            ${
                rules.length

                ?rules
                    .map(
                        i=>
                            incProgress(
                                id,
                                i
                            )
                    )
                    .join('')

                :`
                    <div class="empty">
                        No product incentive set.
                    </div>
                `
            }

        </div>
    `;

    bindCommon();


    $('#incomeForm')
        .onsubmit=
            e=>{

                e.preventDefault();

                const fd=
                    new FormData(
                        e.target
                    );

                const rec={
                    staffId:id,
                    month:selectedMonth,
                    expected:n(
                        fd.get(
                            'expected'
                        )
                    ),
                    growthActual:n(
                        fd.get(
                            'growthActual'
                        )
                    ),
                    productManual:n(
                        fd.get(
                            'productManual'
                        )
                    ),
                    managerActual:n(
                        fd.get(
                            'managerActual'
                        )
                    ),
                    otherActual:n(
                        fd.get(
                            'otherActual'
                        )
                    )
                };

                const st=
                    state();

                st.incomePlans=
                    st.incomePlans
                        .filter(
                            x=>!(
                                x.staffId===id&&
                                x.month===selectedMonth
                            )
                        );

                st.incomePlans.push(
                    rec
                );

                save(st);

                pushCloud(
                    'saveIncome',
                    {
                        month:selectedMonth,
                        expected:rec.expected,
                        growth:rec.growthActual,
                        product:rec.productManual,
                        manager:rec.managerActual,
                        other:rec.otherActual
                    }
                );

                toast(
                    'Income details saved'
                );

                render();
            };


    if($('#incForm')){

        $('#incForm')
            .onsubmit=
                e=>{

                    e.preventDefault();

                    const fd=
                        new FormData(
                            e.target
                        );

                    const st=
                        state();

                    st.incentives.push({
                        id:idGen(),
                        staffId:id,
                        month:selectedMonth,
                        type:'PRODUCT',
                        skuName:String(
                            fd.get(
                                'skuName'
                            )
                        ),
                        targetQty:n(
                            fd.get(
                                'targetQty'
                            )
                        ),
                        reward:n(
                            fd.get(
                                'reward'
                            )
                        )
                    });

                    save(st);

                    toast(
                        'Product incentive created'
                    );

                    render();
                };
    }
}

function incomeRow(
    l,
    v,
    strong=false
){

    return`
        <div
            class="row"
            style="padding:8px 0"
        >

            <span class="muted">
                ${esc(l)}
            </span>

            <${strong?'strong':'span'}>
                ${money(v)}
            </${strong?'strong':'span'}>

        </div>
    `;
}

function incProgress(
    id,
    i
){

    const sold=
        routeSkuAch(
            id,
            i.skuName
        ).cartons;

    const t=
        n(i.targetQty);

    const left=
        Math.max(
            0,
            t-sold
        );

    const pct=
        t
        ?Math.min(
            100,
            sold/t*100
        )
        :0;

    const ok=
        sold>=t;

    return`
        <div class="card">

            <div class="row">

                <div>

                    <h3 style="margin:0">
                        ${esc(i.skuName)}
                    </h3>

                    <p
                        class="muted"
                        style="margin:4px 0 0"
                    >
                        Reward
                        ${money(i.reward)}
                    </p>

                </div>

                <span
                    class="
                        pill
                        ${
                            ok
                            ?'green'
                            :'red'
                        }
                    "
                >
                    ${
                        ok
                        ?'UNLOCKED'
                        :left+' CTN LEFT'
                    }
                </span>

            </div>

            <div
                class="progress-wrap"
                style="margin-top:10px"
            >

                <div
                    class="
                        progress
                        ${
                            ok
                            ?'goodbar'
                            :''
                        }
                    "
                    style="
                        width:${pct}%
                    "
                >
                </div>

            </div>

        </div>
    `;
}


/* =========================================================
   SUMMARY
========================================================= */

function renderSummary(){

    const id=
        uid();

    const m=
        metric(id);

    const inc=
        incomeCalc(id);

    const os=
        monthOutletSales(id)
            .slice()
            .sort(
                (a,b)=>
                    String(b.date)
                        .localeCompare(
                            String(a.date)
                        )
            );

    const ss=
        monthSkuSales(id)
            .slice()
            .sort(
                (a,b)=>
                    String(b.date)
                        .localeCompare(
                            String(a.date)
                        )
            );

    const plans=
        monthPlans(id);


    $('#mainContent')
        .innerHTML=`

        ${monthBar()}


        <div class="hero">

            <p class="eyebrow">
                COMPLETE MONTHLY SUMMARY
            </p>

            <h3>
                ${esc(user(id)?.name||id)}
            </h3>

            <p class="muted">

                Everything submitted for
                ${monthName(selectedMonth)}
                in one place.

            </p>

        </div>


        <div class="grid kpi-grid">

            ${kpi(
                'TARGET',
                money(m.target),
                'Route target'
            )}

            ${kpi(
                'TOTAL SALES',
                money(m.ach),
                'Achievement'
            )}

            ${kpi(
                'SHORTFALL',
                money(m.short),
                'Remaining',
                m.short
                ?'bad'
                :'good'
            )}

            ${kpi(
                'ACHIEVEMENT',
                `${
                    (
                        m.target
                        ?m.ach/m.target*100
                        :0
                    ).toFixed(1)
                }%`,
                'Performance'
            )}

            ${kpi(
                'GROWTH',
                `${
                    m.growth>=0
                    ?'+'
                    :''
                }${m.growth.toFixed(1)}%`,
                'Vs comparable month',
                m.growth>=0
                ?'good'
                :'bad'
            )}

            ${kpi(
                'COVERAGE',
                `${m.coverage.toFixed(0)}%`,
                `${m.covered.length}/${m.routeOutlets.length} outlets`
            )}

            ${kpi(
                'PROJECTED SALARY',
                money(inc.total),
                'All salary + incentives'
            )}

            ${kpi(
                'NEED / DAY',
                money(m.required),
                'Remaining daily requirement'
            )}

        </div>


        ${summaryTable(
            'Daily Sales History',
            [
                'Date',
                'Sales',
                'Last Month',
                'Active',
                'Prepare Trip',
                'Order'
            ],
            m.daily.map(
                x=>[
                    x.date,
                    money(x.todaySales),
                    money(
                        x.lastMonthSameDay
                    ),
                    money(x.active),
                    money(
                        x.prepareTrip
                    ),
                    money(
                        x.orderAmount
                    )
                ]
            )
        )}


        ${summaryTable(
            'Outlet Sales History',
            [
                'Date',
                'Outlet',
                'Sales',
                'Note'
            ],
            os.map(
                x=>[
                    x.date,
                    x.outletName,
                    money(x.sales),
                    x.note||''
                ]
            )
        )}


        ${summaryTable(
            'Outlet Target vs Actual',
            [
                'Outlet',
                'Target',
                'Actual',
                'Shortfall',
                'Status'
            ],
            plans.map(
                p=>{

                    const a=
                        outletAch(
                            id,
                            p.outletName
                        );

                    const sf=
                        Math.max(
                            0,
                            n(
                                p.outletTarget
                            )-
                            a
                        );

                    return[
                        p.outletName,
                        money(
                            p.outletTarget
                        ),
                        money(a),
                        money(sf),
                        sf
                        ?'PUSH'
                        :'ACHIEVED'
                    ];
                }
            )
        )}


        ${summaryTable(
            'SKU Submission History',
            [
                'Date',
                'Outlet',
                'SKU',
                'Cartons',
                'Sales Value'
            ],
            ss.map(
                x=>[
                    x.date,
                    x.outletName,
                    x.skuName,
                    String(x.cartons),
                    money(
                        x.salesValue
                    )
                ]
            )
        )}


        ${summaryTable(
            'SKU Target vs Actual',
            [
                'Outlet',
                'SKU',
                'Target CTN',
                'Sold CTN',
                'CTN Left',
                'Target RM',
                'Actual RM',
                'RM Left'
            ],
            skuTargetRows(id)
        )}


        <div
            class="card"
            style="margin-top:12px"
        >

            <h3>
                Salary & Incentive Breakdown
            </h3>

            ${incomeRow(
                'Basic Salary',
                inc.basic
            )}

            ${incomeRow(
                'Fuel / Oil',
                inc.fuel
            )}

            ${incomeRow(
                'House Rent',
                inc.rent
            )}

            ${incomeRow(
                'Food Allowance',
                inc.food
            )}

            ${incomeRow(
                'Sales Commission',
                inc.comm
            )}

            ${incomeRow(
                'Zero Sales Incentive',
                inc.zero
            )}

            ${incomeRow(
                'Product Incentive',
                inc.product
            )}

            ${incomeRow(
                'Growth Incentive',
                inc.growth
            )}

            ${incomeRow(
                'Manager Incentive',
                inc.manager
            )}

            ${incomeRow(
                'Other Incentive',
                inc.other
            )}

            <hr
                style="
                    border:0;
                    border-top:1px solid var(--line);
                    margin:14px 0
                "
            >

            ${incomeRow(
                'TOTAL PROJECTED',
                inc.total,
                true
            )}

        </div>


        <div
            class="card"
            style="margin-top:12px"
        >

            <button
                id="xlsx"
                class="btn primary"
            >
                DOWNLOAD REAL EXCEL (.xlsx)
            </button>

            ${
                session.mode==='manager'

                ?`
                    <button
                        id="setup"
                        class="btn secondary"
                        style="margin-top:10px"
                    >
                        CLOUD SETUP / SYNC
                    </button>
                `
                :''
            }

        </div>


        ${
            session.mode==='manager'
            ?managerTaskBox(id)
            :''
        }
    `;

    bindCommon();

    if(
        session.mode==='manager'
    ){

        bindTask(id);
    }

    $('#xlsx')
        .onclick=
            ()=>exportXlsx(id);

    if($('#setup')){

        $('#setup')
            .onclick=
                cloudSetup;
    }
}

function summaryTable(
    title,
    heads,
    rows
){

    return`
        <div
            class="card"
            style="
                margin-top:12px;
                overflow:auto
            "
        >

            <h3>
                ${esc(title)}
            </h3>

            <table
                class="summary-table"
                style="
                    min-width:${
                        Math.max(
                            620,
                            heads.length*120
                        )
                    }px
                "
            >

                <thead>

                    <tr>

                        ${
                            heads
                                .map(
                                    h=>`
                                        <th>
                                            ${esc(h)}
                                        </th>
                                    `
                                )
                                .join('')
                        }

                    </tr>

                </thead>


                <tbody>

                    ${
                        rows.length

                        ?rows
                            .map(
                                r=>`
                                    <tr>
                                        ${
                                            r.map(
                                                c=>`
                                                    <td>
                                                        ${esc(c)}
                                                    </td>
                                                `
                                            )
                                            .join('')
                                        }
                                    </tr>
                                `
                            )
                            .join('')

                        :`
                            <tr>
                                <td
                                    colspan="${heads.length}"
                                >
                                    No data
                                </td>
                            </tr>
                        `
                    }

                </tbody>

            </table>

        </div>
    `;
}

function skuTargetRows(id){

    const rows=[];

    monthPlans(id)
        .forEach(
            p=>
                (
                    p.targetSkus||
                    []
                )
                .forEach(
                    sku=>{

                        const t=
                            p.skuTargets?.[
                                sku
                            ]||{
                                cartons:0,
                                value:0
                            };

                        const a=
                            skuAch(
                                id,
                                p.outletName,
                                sku
                            );

                        rows.push([
                            p.outletName,
                            sku,
                            String(
                                n(
                                    t.cartons
                                )
                            ),
                            String(
                                a.cartons
                            ),
                            String(
                                Math.max(
                                    0,
                                    n(
                                        t.cartons
                                    )-
                                    a.cartons
                                )
                            ),
                            money(
                                t.value
                            ),
                            money(
                                a.value
                            ),
                            money(
                                Math.max(
                                    0,
                                    n(
                                        t.value
                                    )-
                                    a.value
                                )
                            )
                        ]);
                    }
                )
        );

    return rows;
}


/* =========================================================
   XLSX EXPORT
========================================================= */

async function loadXlsx(){

    if(window.XLSX)
        return true;

    return new Promise(
        resolve=>{

            const s=
                document
                    .createElement(
                        'script'
                    );

            s.src=
                'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

            s.onload=
                ()=>resolve(true);

            s.onerror=
                ()=>resolve(false);

            document.head
                .appendChild(s);
        }
    );
}

async function exportXlsx(id){

    toast(
        'Preparing Excel...'
    );

    if(
        !await loadXlsx()
    ){

        toast(
            'Could not load Excel library'
        );

        return;
    }

    const m=
        metric(id);

    const inc=
        incomeCalc(id);

    const wb=
        XLSX.utils
            .book_new();

    const plans=
        monthPlans(id);


    addSheet(
        wb,
        'Summary',
        [{
            Month:selectedMonth,
            'Staff ID':id,
            Salesman:
                user(id)?.name||'',
            Target:m.target,
            Achievement:m.ach,
            Shortfall:m.short,
            'Achievement %':
                m.target
                ?m.ach/m.target*100
                :0,
            Growth:m.growth,
            Coverage:m.coverage,
            'Projected Salary':
                inc.total
        }]
    );


    addSheet(
        wb,
        'Daily',
        m.daily.map(
            x=>({
                Date:x.date,
                Sales:x.todaySales,
                'Last Month':
                    x.lastMonthSameDay,
                Active:x.active,
                'Prepare for Trip':
                    x.prepareTrip,
                Order:x.orderAmount,
                Note:x.note||''
            })
        )
    );


    addSheet(
        wb,
        'Outlet Sales',
        monthOutletSales(id)
            .map(
                x=>({
                    Date:x.date,
                    'Outlet Code':
                        x.outletCode,
                    'Outlet Name':
                        x.outletName,
                    Sales:x.sales,
                    Note:x.note||''
                })
            )
    );


    addSheet(
        wb,
        'SKU Sales',
        monthSkuSales(id)
            .map(
                x=>({
                    Date:x.date,
                    Outlet:
                        x.outletName,
                    SKU:
                        x.skuName,
                    Cartons:
                        x.cartons,
                    'Sales Value':
                        x.salesValue
                })
            )
    );


    const skuRows=[];

    plans.forEach(
        p=>
            (
                p.targetSkus||
                []
            )
            .forEach(
                sku=>{

                    const t=
                        p.skuTargets?.[
                            sku
                        ]||{
                            cartons:0,
                            value:0
                        };

                    const a=
                        skuAch(
                            id,
                            p.outletName,
                            sku
                        );

                    skuRows.push({
                        Outlet:
                            p.outletName,
                        SKU:
                            sku,
                        'Target CTN':
                            n(
                                t.cartons
                            ),
                        'Actual CTN':
                            a.cartons,
                        'CTN Left':
                            Math.max(
                                0,
                                n(
                                    t.cartons
                                )-
                                a.cartons
                            ),
                        'Target RM':
                            n(
                                t.value
                            ),
                        'Actual RM':
                            a.value,
                        'RM Left':
                            Math.max(
                                0,
                                n(
                                    t.value
                                )-
                                a.value
                            )
                    });
                }
            )
    );


    addSheet(
        wb,
        'SKU Target',
        skuRows
    );


    addSheet(
        wb,
        'Income',
        [
            {
                Component:'Basic',
                Amount:inc.basic
            },
            {
                Component:'Fuel',
                Amount:inc.fuel
            },
            {
                Component:'House Rent',
                Amount:inc.rent
            },
            {
                Component:'Food',
                Amount:inc.food
            },
            {
                Component:'Commission',
                Amount:inc.comm
            },
            {
                Component:'Zero Sales Incentive',
                Amount:inc.zero
            },
            {
                Component:'Product Incentive',
                Amount:inc.product
            },
            {
                Component:'Growth Incentive',
                Amount:inc.growth
            },
            {
                Component:'Manager Incentive',
                Amount:inc.manager
            },
            {
                Component:'Other Incentive',
                Amount:inc.other
            },
            {
                Component:'TOTAL',
                Amount:inc.total
            }
        ]
    );


    XLSX.writeFile(
        wb,
        `${id}_${selectedMonth}_Sales_Performance.xlsx`
    );

    toast(
        'Excel downloaded'
    );
}

function addSheet(
    wb,
    name,
    rows
){

    const ws=
        XLSX.utils
            .json_to_sheet(
                rows.length
                ?rows
                :[
                    {
                        Info:'No data'
                    }
                ]
            );

    XLSX.utils
        .book_append_sheet(
            wb,
            ws,
            name.slice(0,31)
        );
}


/* =========================================================
   TASKS
========================================================= */

function renderTasks(){

    const id=
        uid();

    const tasks=
        state()
            .tasks
            .filter(
                t=>
                    t.staffId===id
            )
            .slice()
            .sort(
                (a,b)=>
                    String(
                        b.createdAt
                    )
                    .localeCompare(
                        String(
                            a.createdAt
                        )
                    )
            );


    $('#mainContent')
        .innerHTML=`

        ${monthBar()}

        <div class="card">

            <p class="eyebrow">
                TASKS
            </p>

            <h2>
                ${
                    session.mode==='manager'
                    ?'Selected SR Tasks'
                    :'My Tasks'
                }
            </h2>

        </div>


        <div
            class="list"
            style="margin-top:12px"
        >

            ${
                tasks.length

                ?tasks
                    .map(
                        t=>`
                            <div class="list-item">

                                <div class="row">

                                    <div>

                                        <h4>
                                            ${esc(t.title)}
                                        </h4>

                                        <p>

                                            ${esc(
                                                t.note||
                                                'No instruction'
                                            )}

                                            ${
                                                t.due
                                                ?'<br>Due: '+
                                                    esc(t.due)
                                                :''
                                            }

                                        </p>

                                    </div>


                                    <span
                                        class="
                                            pill
                                            ${
                                                t.done
                                                ?'green'
                                                :'red'
                                            }
                                        "
                                    >
                                        ${
                                            t.done
                                            ?'DONE'
                                            :'PENDING'
                                        }
                                    </span>

                                </div>


                                ${
                                    session.mode!=='manager'&&
                                    !t.done

                                    ?`
                                        <button
                                            class="btn secondary"
                                            data-done="${esc(t.id)}"
                                            style="margin-top:8px"
                                        >
                                            MARK COMPLETE
                                        </button>
                                    `
                                    :''
                                }

                            </div>
                        `
                    )
                    .join('')

                :`
                    <div class="empty">
                        No task assigned.
                    </div>
                `
            }

        </div>


        ${
            session.mode==='manager'
            ?managerTaskBox(id)
            :''
        }
    `;

    bindCommon();

    bindTask(id);


    $$('[data-done]')
        .forEach(
            b=>
                b.onclick=
                    ()=>{

                        const s=
                            state();

                        const t=
                            s.tasks
                                .find(
                                    x=>
                                        x.id===
                                        b.dataset.done
                                );

                        if(t)
                            t.done=true;

                        save(s);

                        toast(
                            'Task completed'
                        );

                        render();
                    }
        );
}


function managerTaskBox(id){

    return`
        <div
            class="card"
            style="margin-top:12px"
        >

            <p class="eyebrow">
                MANAGER TASK
            </p>


            <form
                id="managerTaskForm"
                class="stack"
            >

                <label>

                    Task Title

                    <input
                        name="title"
                        required
                    >

                </label>


                <label>

                    Instruction

                    <textarea
                        name="note"
                        required
                    ></textarea>

                </label>


                <label>

                    Due Date

                    <input
                        name="due"
                        type="date"
                    >

                </label>


                <button class="btn primary">
                    SEND TASK
                </button>

            </form>

        </div>
    `;
}

function bindTask(id){

    const f=
        $('#managerTaskForm');

    if(!f)
        return;

    f.onsubmit=
        e=>{

            e.preventDefault();

            const fd=
                new FormData(
                    e.target
                );

            const rec={
                id:idGen(),
                staffId:id,
                title:String(
                    fd.get(
                        'title'
                    )
                ),
                note:String(
                    fd.get(
                        'note'
                    )
                ),
                due:String(
                    fd.get(
                        'due'
                    )||''
                ),
                done:false,
                createdAt:
                    new Date()
                        .toISOString()
            };

            const s=
                state();

            s.tasks.push(
                rec
            );

            save(s);

            pushCloud(
                'saveTask',
                {
                    staffId:id,
                    title:rec.title,
                    instruction:
                        rec.note,
                    due:rec.due
                }
            );

            toast(
                'Task assigned'
            );

            render();
        };
}


/* =========================================================
   ZERO SALES
========================================================= */

function renderZero(){

    const id=
        uid();

    const m=
        metric(id);

    $('#mainContent')
        .innerHTML=`

        ${monthBar()}


        <div class="hero">

            <p class="eyebrow">
                ZERO SALES COVERAGE
            </p>

            <h3>
                ${m.coverage.toFixed(0)}%
                Covered
            </h3>

            <p class="muted">

                ${m.covered.length}
                covered

                •

                ${m.zeroSales.length}
                zero sales

                •

                ${m.routeOutlets.length}
                total outlets

            </p>


            <div class="progress-wrap">

                <div
                    class="
                        progress
                        ${
                            m.coverage>=100
                            ?'goodbar'
                            :''
                        }
                    "
                    style="
                        width:${m.coverage}%
                    "
                >
                </div>

            </div>

        </div>


        <div class="section-title">

            <h3>
                Zero Sales Outlets
            </h3>

        </div>


        <div class="list">

            ${
                m.zeroSales.length

                ?m.zeroSales
                    .map(
                        o=>`
                            <div class="list-item">

                                <div class="row">

                                    <div>

                                        <h4>
                                            ${esc(o.name)}
                                        </h4>

                                        <p>

                                            ${esc(
                                                o.category||
                                                'Other'
                                            )}

                                            •

                                            ${esc(
                                                o.code||
                                                'No code'
                                            )}

                                        </p>

                                    </div>


                                    <span class="pill red">
                                        ZERO
                                    </span>

                                </div>

                            </div>
                        `
                    )
                    .join('')

                :`
                    <div class="empty">
                        Excellent — all outlets have sales.
                    </div>
                `
            }

        </div>
    `;

    bindCommon();
}


/* =========================================================
   SKU PERFORMANCE
========================================================= */

function renderSku(){

    const id=
        uid();

    const plans=
        monthPlans(id);

    $('#mainContent')
        .innerHTML=`

        ${monthBar()}


        <div class="card">

            <p class="eyebrow">
                SKU PERFORMANCE
            </p>

            <h2>
                Target vs Actual
            </h2>

        </div>


        <div
            class="list"
            style="margin-top:12px"
        >

            ${
                plans.length

                ?plans
                    .map(
                        p=>`
                            <div class="card">

                                <h3>
                                    ${esc(p.outletName)}
                                </h3>

                                ${
                                    (
                                        p.targetSkus||
                                        []
                                    ).length

                                    ?(
                                        p.targetSkus||
                                        []
                                    )
                                    .map(
                                        sku=>{

                                            const t=
                                                p.skuTargets?.[
                                                    sku
                                                ]||{
                                                    cartons:0,
                                                    value:0
                                                };

                                            const a=
                                                skuAch(
                                                    id,
                                                    p.outletName,
                                                    sku
                                                );

                                            const left=
                                                Math.max(
                                                    0,
                                                    n(
                                                        t.cartons
                                                    )-
                                                    a.cartons
                                                );

                                            const pct=
                                                n(
                                                    t.cartons
                                                )
                                                ?Math.min(
                                                    100,
                                                    a.cartons/
                                                    n(
                                                        t.cartons
                                                    )*
                                                    100
                                                )
                                                :0;

                                            return`
                                                <div
                                                    class="list-item"
                                                    style="margin-top:8px"
                                                >

                                                    <div class="row">

                                                        <div>

                                                            <h4>
                                                                ${esc(sku)}
                                                            </h4>

                                                            <p>

                                                                ${a.cartons}
                                                                /
                                                                ${n(t.cartons)}
                                                                CTN

                                                                •

                                                                ${money(a.value)}
                                                                /
                                                                ${money(t.value)}

                                                            </p>

                                                        </div>


                                                        <span
                                                            class="
                                                                pill
                                                                ${
                                                                    left
                                                                    ?'red'
                                                                    :'green'
                                                                }
                                                            "
                                                        >
                                                            ${
                                                                left
                                                                ?left+' LEFT'
                                                                :'DONE'
                                                            }
                                                        </span>

                                                    </div>


                                                    <div
                                                        class="progress-wrap"
                                                        style="margin-top:8px"
                                                    >

                                                        <div
                                                            class="
                                                                progress
                                                                ${
                                                                    pct>=100
                                                                    ?'goodbar'
                                                                    :''
                                                                }
                                                            "
                                                            style="
                                                                width:${pct}%
                                                            "
                                                        >
                                                        </div>

                                                    </div>

                                                </div>
                                            `;
                                        }
                                    )
                                    .join('')

                                    :`
                                        <p class="muted">
                                            No targeted SKU.
                                        </p>
                                    `
                                }

                            </div>
                        `
                    )
                    .join('')

                :`
                    <div class="empty">
                        No SKU plan this month.
                    </div>
                `
            }

        </div>
    `;

    bindCommon();
}


/* =========================================================
   TEAM
========================================================= */

function renderTeam(){

    if(
        session.mode!==
        'manager'
    ){

        page='dashboard';

        render();

        return;
    }


    $('#mainContent')
        .innerHTML=`

        ${monthBar()}


        <div class="card manager-banner">

            <p class="eyebrow">
                MANAGER ACCESS
            </p>

            <h2>
                Team Control Center
            </h2>

            <p class="muted">

                Tap a salesman
                to review full performance.

            </p>

        </div>


        <div
            class="list"
            style="margin-top:12px"
        >

            ${
                salesUsers()
                    .map(
                        u=>{

                            const m=
                                metric(
                                    u.id
                                );

                            const pct=
                                m.target
                                ?m.ach/m.target*100
                                :0;

                            return`
                                <div class="card">

                                    <div class="row">

                                        <div>

                                            <h3
                                                style="margin:0"
                                            >
                                                ${esc(u.name)}
                                            </h3>

                                            <p
                                                class="muted"
                                                style="margin:4px 0 0"
                                            >

                                                ${u.id}

                                                •

                                                Target
                                                ${money(m.target)}

                                            </p>

                                        </div>


                                        <span
                                            class="
                                                pill
                                                ${
                                                    pct>=100
                                                    ?'green'
                                                    :pct>=80
                                                        ?'orange'
                                                        :'red'
                                                }
                                            "
                                        >
                                            ${pct.toFixed(0)}%
                                        </span>

                                    </div>


                                    <div
                                        class="mini-grid"
                                        style="margin-top:10px"
                                    >

                                        <div class="metric-box">

                                            <small>
                                                Sales
                                            </small>

                                            <br>

                                            <b>
                                                ${money(m.ach)}
                                            </b>

                                        </div>


                                        <div class="metric-box">

                                            <small>
                                                Shortfall
                                            </small>

                                            <br>

                                            <b>
                                                ${money(m.short)}
                                            </b>

                                        </div>


                                        <div class="metric-box">

                                            <small>
                                                Need / Day
                                            </small>

                                            <br>

                                            <b>
                                                ${money(m.required)}
                                            </b>

                                        </div>


                                        <div class="metric-box">

                                            <small>
                                                Coverage
                                            </small>

                                            <br>

                                            <b>
                                                ${m.coverage.toFixed(0)}%
                                            </b>

                                        </div>

                                    </div>


                                    <button
                                        class="btn secondary"
                                        data-open="${u.id}"
                                        style="margin-top:10px"
                                    >
                                        OPEN FULL DETAILS
                                    </button>

                                </div>
                            `;
                        }
                    )
                    .join('')
            }

        </div>
    `;

    bindCommon();


    $$('[data-open]')
        .forEach(
            b=>
                b.onclick=
                    async ()=>{

                        managerView=
                            b.dataset.open;

                        refreshTop();

                        if(backendUrl()){

                            await syncCloud(
                                uid(),
                                selectedMonth
                            );
                        }

                        page=
                            'dashboard';

                        render();
                    }
        );
}


/* =========================================================
   CLOUD SETUP
========================================================= */

async function cloudSetup(){

    const url=
        prompt(
            'Paste Google Apps Script Web App URL ending with /exec.\n\nLeave blank for local-only mode.',
            backendUrl()
        );

    if(url===null)
        return;

    localStorage.setItem(
        BACKEND,
        url.trim()
    );

    if(!url.trim()){

        toast(
            'Local mode enabled'
        );

        return;
    }

    toast(
        'Cloud URL saved • syncing...'
    );

    const ok=
        await syncCloud(
            uid(),
            selectedMonth
        );

    toast(
        ok
        ?'Cloud sync connected'
        :'Cloud connection failed'
    );

    render();
}


/* =========================================================
   STARTUP
========================================================= */

$('#loginForm')
    .onsubmit=
        e=>{

            e.preventDefault();

            login(
                $('#loginUser').value,
                $('#loginPin').value
            );
        };


$('#logoutBtn')
    .onclick=
        logout;


$('#notifBtn')
    .onclick=
        ()=>{

            page=
                'dashboard';

            render();

            notifyAlerts();
        };


$('#bottomNav')
    .onclick=
        e=>{

            const b=
                e.target
                    .closest(
                        'button[data-page]'
                    );

            if(!b)
                return;

            page=
                b.dataset.page;

            render();
        };


const saved=
    sessionStorage
        .getItem(
            SESSION
        );


if(saved){

    try{

        session=
            JSON.parse(
                saved
            );

        if(
            session&&
            user(
                session.id
            )
        ){

            if(
                session.mode===
                'manager'
            ){

                managerView=
                    'M21954';
            }

            openApp();

        }else{

            sessionStorage
                .removeItem(
                    SESSION
                );

            session=null;
        }

    }catch{

        sessionStorage
            .removeItem(
                SESSION
            );
    }
}


if(
    'serviceWorker'
    in navigator
){

    navigator
        .serviceWorker
        .register(
            './sw.js',
            {
                updateViaCache:
                    'none'
            }
        )
        .then(
            r=>r.update()
        )
        .catch(
            ()=>{}
        );
}
