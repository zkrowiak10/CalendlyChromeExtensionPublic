resetMode=false;
const <HOSTCOMPANY>LoginURI ='https://ppc.<HOSTCOMPANY>.com/admin/product_login/'
const googleURI = 'https://ads.google.com/aw/overview?__e='
let logging = true



function initiate() {
    $('#logout').hide()
    $('#logout').click(logout)
    $('#login').click(syncAccount)  
    $('#getStuff').click(calendars)
    $('#loading').show()
    $('#buttons').hide()
    $('#today').click(()=>{
        $('#calendar').children().remove();
        save('today',"")
        makeToday()})
    $('document').ready(checkIn())
    $('document').ready(makePinned())
    $('#pinIt').click(makePinningDialogue)
}

initiate()


function loadingView(){
    $('#loading').toggle();
    $('#buttons').toggle()
  }
  

  //rewrite this as a function that calls calendars --> and calendars calls it back at the end.
function makeToday(){
    let today = new Date();
    today.setHours(0,0,0,0)
    checkSF()
    if (window.localStorage.getItem('today')!= today.toDateString()) {
        logger('Just logged in, or new day');
        calendars(today)
        .then(()=> {
            makeCards()
            today = new Date(); //need to reset this value as the calendars function changes the day to get tomorrow's date
            today.setHours(0,0,0,0)
            logger(today.toDateString())
            window.localStorage.setItem('today',today.toDateString())
        })
    }
    else {
        makeCards()
        
    }
}



async function makeCards() {
    let appointments = JSON.parse(window.localStorage.getItem('todayCalendar'))
    let cards = await calendarLoop(appointments)

    
    cards.sort(compareCards);
    logger(cards)
    logger('cardlength', cards.length)
    
    for (card of cards) {
        logger('test')
        $('#calendar').append(card)
    }

        
}

function calendarLoop(appointments) {
    return new Promise((resolve,reject)=> {
        let l = appointments.value.length;
        let cards = []
        for (let i=0; i<l; i++){
            //find all calendly made appointemnts
            let calendly = /calendly.com/i;
            let appointment = appointments.value[i];
            let content = appointment.body.content;
            let search = content.search(calendly) 
            if ( search > -1) {
                
                //get first client that is not me (current user later)
                let email = appointment.attendees[0].emailAddress.address;
                let name= appointment.attendees[0].emailAddress.name
                if (email == open('me').email) { 
                    email = appointment.attendees[1].emailAddress.address
                    name = appointment.attendees[1].emailAddress.name
                }
    
                if (resetMode){ window.localStorage.removeItem(email) } //to reset local storage while developing
                
                if (!open(email)){
                    //checkSF only if client info is not stored.
                    
                    searchSF(email).then(function(resolve) {
        
                        let client = open(email)
                        client.email = email;
                        client.name = name;
                        save(email, client)
                        appointment.client = client;
                        cards.push(makeFrame(appointment))
                        
                    }).catch((err)=>{
                        
                        let client = {}
                        client.email = email;
                        client.name = name
                        appointment.client = client;
                        save(email, client)
                        cards.push(makeFrame(appointment))
                        loginSF()
                        return
                    })
                }
                else {
    
                        let client = open(email)
                        client.email = email;
                        client.name = name;
                        save(email, client)
                        appointment.client = client;
                        cards.push(makeFrame(appointment))
                }
            };
        }
        resolve(cards)
        
    })
}

function loginSF(){
    let confirm = window.confirm("You are not logged into salesforce. Go to Salesforce then come back to extension")
    
    if (confirm){
        chrome.tabs.create({url:"https://<HOSTCOMPANY>.my.salesforce.com/"})
    }
}

function makePinned(){
    let pinned = open('pinnedClients')
    if (pinned) {
        
        
        for (email of pinned) {
            let client = open(email)
            client.email = email;
            let card = makePinnedCard(client) 
            $('#pinned').append(card)
        }
    }
}

function makePinningDialogue() {
    chrome.tabs.query({'active':true, 'currentWindow':true}, (tab)=>{
        let url = tab[0].url
        if (url.search("https://<HOSTCOMPANY>.my.salesforce.com/")==-1) {  //validate tab
            alert('This function is only available on Salesforce.')
        }
        var re = /salesforce.com\/(\w*)\?*/;
        //logger(re.exec(url))
        sfid  = re.exec(url)[1]
        fetch(SFContactList+sfid, {credentials: "include", mode: 'cors'}) //go to list of contacts and return all primary contacts
        .then((response)=>{return response.text()})
        .then(text=>{
            let card=$('<div id="pinnedCard" class="card">')
            let form = $('<form style="margin:10px;  box-shadow: 2px 2px 3px gray" class="card-header form-group">Please Choose A Primary Contact</form>')
            let options = $('<div class=card-body>')
            let parser = new DOMParser();
            doc = parser.parseFromString(text, "text/html");
            let contacts = doc.getElementsByClassName("pbBody")[0].getElementsByClassName("list")[0].rows;
            let l = contacts.length
            for (let i=1; i<l; i++) {
                contact = contacts[i];
                if (contact.cells[4].children[0].getAttribute('alt') == "Not Checked") {continue} //passover non-primary contacts
                let name = contact.cells[1].innerText 
                let email = contact.cells[3].innerText
                options.append(`<input type='radio' name='client' data-name="${name}" value="${email}"> ${name}<br>`)
                

            }
            let button = $('<button  type="button" class="btn btn-outline-primary">Submit</button>')
            button.click(()=>{customPin(sfid); $('#pinnedCard').remove()} )
            form.append(options)
            form.append(button)
            
            card.append(form)
            $('#pinnedDialogue').append(card)
        })    



    })
}

function customPin(sfid) {
    let email = $('#pinnedDialogue').find("input[name='client']:checked").val()
    let name = $('#pinnedDialogue').find("input[name='client']:checked").data().name
    //logger('name' , name.name)
    searchSF(email).then(()=>{
        let client = JSON.parse(window.localStorage.getItem(email));
        client.name = name
        client.pinned=true
        $('#pinned').append(makePinnedCard(client))
        client.pinned=true;
        let pinnedClients = JSON.parse(window.localStorage.getItem('pinnedClients'))
        if (!pinnedClients) {pinnedClients = []}
        window.localStorage.setItem(email, JSON.stringify(client))
        pinnedClients.push(email);
        window.localStorage.setItem('pinnedClients', JSON.stringify(pinnedClients))

    })

}
logger('token test' , tokenObj)
function compareCards(a, b) {
    dateA = new Date (a.data('time'))
    dateB = new Date (b.data('time'))
    return dateA.getTime() - dateB.getTime()
}

function logger(message, object) {
    if (logging) {
        if (!object) {console.log(message)}
        else {console.log(message, object)}
        
    }
}