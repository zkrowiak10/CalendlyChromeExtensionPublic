






let SFDC = "https://<HOSTCOMPANY>.my.salesforce.com/"
let gainsight ="https://<HOSTCOMPANY>--jbcxm.na66.visual.force.com/apex/JBCXM__customersuccess360?cid="
const SFContactList = "https://<HOSTCOMPANY>.my.salesforce.com/003?rlid=RelatedContactList&id="


async function searchSF(email){
    let base = 'https://<HOSTCOMPANY>.my.salesforce.com/search/SearchResults?searchType=2&str=';
    let target = encodeURI(base+email);
    let sfData = {};
    let test = open(email)
    if (test) {
        sfData = test
    }
    
    //check that contact data is not in existence
    /*if (window.localStorage.getItem(email)){
        //logger('contact data already exists')
        return
    }*/

    let promise = new Promise ((resolve,reject) =>{
        fetch(target, {credentials: "include", mode: 'cors'}).then(function(response) {
            return response.text()})
        .then(function(text){
            ////logger(text)
            let error = 'redirectOnLoad()';
            let checker = text.search(error);
            let parser = new DOMParser();
            doc = parser.parseFromString(text, "text/html");
            if (checker!=-1){
                //alert('You are not logged in. Please go to salesforce.com and log in')
                resolve(false)
                //s//logger('resolved false')
                return
            }
            try {
                var hrf = doc.getElementById('Account_body').getElementsByTagName('table')[0].rows[1].cells[1].getElementsByTagName('a')[0].getAttribute('href');
            }
            catch(err){
                let message = err + '. Error tiere 1 email is:' + email;
                //logger(message)
                try{
                    hrf = doc.getElementById("Contact_body").getElementsByTagName('table')[0].rows[1].cells[2].getElementsByTagName('a')[0].getAttribute('href');
                }
                catch(err){
                    let message = err + '.Error tier 2 email is:' + email;
                    //logger(message)
                }
            }
            let sfid = hrf.split('?')[0];
            sfid = sfid.slice(1);
            //logger('sfid',sfid)
            sfData.sfid = sfid;
            window.localStorage.setItem(email,JSON.stringify(sfData));
            parseSFID(sfid, email)
            .then(()=>{resolve()}).catch((err)=> {reject(err)});
        }).catch((err)=> {reject(err)})
        
    })
    let result = await promise
    return result;
}

async function parseSFID(hrf,email) {
    let sfData = JSON.parse(window.localStorage.getItem(email))
    if(!sfData) { sfData={};}
    let profiles = await parseProfiles(hrf);
    
    let promise = new Promise((resolve,reject)=> {
        fetch(SFDC+hrf,{credentials: "include", mode: 'cors'})
        .then(response=>{return response.text()})
        .then(text=>{
            //let id = sfData.sfid + '_00N80000004l7nV_body'
            let parser = new DOMParser();
            doc = parser.parseFromString(text, "text/html");
             //was let profiles = doc.getElementById(id).getElementsByClassName("list")[0].rows
            let company = doc.getElementById("acc2_ileinner").innerText.replace("[View Hierarchy]","").trim();
            let l = profiles.length;
            logger('length of profiles', l)
            ////logger('in Salesforce.js, company:', company)
            sfData.company = company;
            sfData.profiles =[];
            for (let i=1; i<l; i++) {
                let obj = {}
                let element= profiles[i];
                if  (element.cells[9].innerHTML != '&nbsp;'){
                    ////logger(`Email = ${email}; this text should be a date`,element.cells[10].innerHTML)
                    continue;
                }
                obj.ws= element.cells[1].innerText;
                obj.google = element.cells[2].innerText;
                obj.friendlyName=  element.cells[5].innerText;
                logger('profile obj', obj)
                sfData.profiles.push(obj)
            };
            let message = `email: "${email}";`
            ////logger(message,sfData)
            
            
            window.localStorage.setItem(email,JSON.stringify(sfData));
            resolve()   
        }).catch((err)=> {reject(err)})
    })
    
    let result = await promise;
    return result;
}
        

function checkSF(){
    return new Promise((resolve,reject)=>{
        ////logger('promise')
        fetch("https://<HOSTCOMPANY>.my.salesforce.com/", {credentials: "include", mode: 'cors'}).then(function(response) {
            return response.text()})
        .then(function(text){
            ////logger("checkSFText",text)
            let error = 'redirectOnLoad()';
            let error2 = 'Login to your Salesforce Customer Account'
            let checker = text.search(error);
            let checker2 = text.search(error2)
            ////logger('checker', checker)
            ////logger('checker2',checker2)
            if (checker!=-1 || checker2 != -1){
                ////logger('true')
                loginSF()
                resolve(true)
            }
            else {
                ////logger('false')
                resolve(false)
            }
        })
    })
}


async function parseProfiles(hrf){
    let target = "https://<HOSTCOMPANY>.my.salesforce.com/a06?rlid=00N80000004l7nV&id=" + hrf; 
    return fetch(target,{credentials: "include", mode: 'cors'})
    .then((response)=>{return response.text()})
    .then(text=>{
        let parser = new DOMParser();
        doc = parser.parseFromString(text, "text/html");
        let profiles = doc.getElementsByClassName("pbBody")[0].getElementsByClassName("list")[0].rows;
        return profiles


    })
    
}


//searchSF('ben@todayslocalmedia.com')

        /*fetch(hrf.getAttribute('href'), {credentials: "include", mode: 'cors'})
            .then(response=> {return response.text})
            .then(page=>{
                let html = parser.parseFromString(page,"text/html")
                html.getElementById("0010y00001ZAdI4_00N80000004l7nV_body")
                .getElementsByClassName("list")[0]
                .rows[1]
                .cells[1]
                .innerText /0011A00001QoNDL?srPos=0&srKp=001
            
            })
    
        
            
        
    })*/
