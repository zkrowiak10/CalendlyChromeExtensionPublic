//config
var authEndpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?";
var tokenEndPoint = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
var redirectUri = chrome.identity.getRedirectURL("outlook");
var appId = '<APP ID>';
var scopes = 'openid Calendars.Read user.read offline_access';
var calendar_url = 'https://graph.microsoft.com/v1.0/me/calendarview?'
var tokenObj = JSON.parse(window.localStorage.getItem('tokenObj'));

function checkIn(){
  if (!tokenObj){
    ////logger("the token object is undefined, login required",tokenObj)
    tokenObj={}
    loadingView()
  }
  
  else{
    
    window.localStorage.setItem('loggedIn',true)
    
    ////logger('logged in',tokenObj)
    $('#logout').show();
    $('#login').hide();
    $('#me').text(open('me').name)
    loadingView();
    makeToday()
  
  }
}

//testing me function

async function calendars(date){
  
  date.setHours(0,0,0,0)//set date to midnight
  today = date.toISOString();//create datestring
  let day = date.getDate()
  date.setDate(day+1)//get tomorrow's date
  tomorrow = date.toISOString();
  let response = new Promise((resolve,reject) => { getAccessToken(()=>{
    $.ajax({
      type: 'GET',
      url: calendar_url + `startdatetime=${today}&enddatetime=${tomorrow}&$top=10`,
      headers: {
          "Authorization": "Bearer " + tokenObj.accessToken,
          'prefer': 'outlook.timezone="Eastern Standard Time"'
          }
    }).done(function(data){
      window.localStorage.setItem('todayCalendar',JSON.stringify(data))
      resolve(data)
      })
  })})
  
  let result = await response
  return result
}

function syncAccount(){
    ////logger('beginning')
    //loadingView();
    if (!window.localStorage.getItem('tokenObj')) {            
        let requestURL = {'url': buildAuthUrl(), 'interactive':true}
        chrome.identity.launchWebAuthFlow(requestURL,function(response){
            logger('new respons', response)
            let params = parseHashParams(response);
            let code = params.code;
            let formP = buildCodeAuthUrl(code);
            $.ajax({
              type: "POST",
              url: tokenEndPoint,
              headers: {
                "Content-Type": "application/x-www-form-urlencoded"
              },
              data: formP

            }).then((response)=>{
              logger('ajax response: ', response)
              handleTokenResponse(response);
              window.localStorage.setItem('tokenObj', JSON.stringify(tokenObj))
            }).done(function() {
                      $.ajax({
                        type: 'GET',
                        url: "https://graph.microsoft.com/v1.0/me",
                        headers: {
                            "Authorization": "Bearer " + tokenObj.accessToken,
                            }
                      }).done(function(data){
                      //logger('me', data)
                      let me = {}
                      me.email = data.mail 
                      me.name = data.displayName
                      save('me', me)
                      $('#me').text(me.name)
                      makeToday()
                    })
              })
            
            
        })/*.done(function(data){
               //logger('me', data)
               let me = {}
               me.email = data.mail 
               me.name = data.displayName
               save('me', me)
               $('#me').text(me.name)
               makeToday()
             
        })*/
      
          
            ////logger('stored')
            $('#login').hide();
            $('#logout').show();
            //loadingView();
        }
    
    else{
        ////logger('already logged in')
        $('#return').text('already in')
        $('#login').hide();
        $('#logout').show();
        ////logger(JSON.toString(tokenObj))
       // loadingView();
    }
}

// Helper method to validate token and refresh
// if needed
async function getAccessToken(callback) {
  var now = new Date().getTime();
  var isExpired = now > parseInt(tokenObj.tokenExpires);
  // Do we have a token already?
  if (tokenObj.accessToken && !isExpired) {
    // Just return what we have
    ////logger('access token exists and isnt expired')
    if (callback) {
      callback();
    }
  } else {
    await refreshToken();
  }
}

function refreshToken() {
  return new Promise((resolve,reject) => {
    refresh = buildRefreshUrl();
    $.ajax({
      type: "POST",
      url: tokenEndPoint,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      data: refresh
    }
    ).then((response)=>{
      //logger('refresh response: ', response)
      handleTokenResponse(response);
      window.localStorage.setItem('tokenObj', JSON.stringify(tokenObj))
      resolve();
  })
})
}
  

function logout(){
  items =['tokenObj','me','pinnedClients']
  for (item of items) {
    window.localStorage.removeItem(item)
  }
  
  $("#calendar").children().remove()
  $("#pinned").children().remove()
  window.localStorage.setItem('loggedIn',false)
  //logger(tokenObj)
  $('#login').show();
  $('#logout').hide();
  $('#me').text('')
}


//helper functions
function guid() {
    var buf = new Uint16Array(8);
    var cryptObj = window.crypto 
    cryptObj.getRandomValues(buf);
    function s4(num) {
      var ret = num.toString(16);
      while (ret.length < 4) {
        ret = '0' + ret;
      }
      return ret;
    }
    return s4(buf[0]) + s4(buf[1]) + '-' + s4(buf[2]) + '-' + s4(buf[3]) + '-' +
      s4(buf[4]) + '-' + s4(buf[5]) + s4(buf[6]) + s4(buf[7]);
  }
function buildAuthUrl() {
  // Generate random values for state and nonce
  sessionStorage.authState = guid();
  sessionStorage.authNonce = guid();

  var authParams = {
    response_type: 'code',
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopes,
    state: sessionStorage.authState,
    nonce: sessionStorage.authNonce,
    response_mode: 'fragment'
  };
  //logger(redirectUri)
  
    return authEndpoint + $.param(authParams);
  }
  function buildCodeAuthUrl(authCode) {
    // Generate random values for state and nonce
    sessionStorage.authState = guid();
    sessionStorage.authNonce = guid();
  
    var authParams = {
      response_type: 'code',
      grant_type: "authorization_code",
      client_id: appId,
      redirect_uri: redirectUri,
      code: authCode,
      scope: scopes,
      state: sessionStorage.authState,
      nonce: sessionStorage.authNonce,
      client_secret: "<client secret>",
      
    };
    //logger(redirectUri)
    
      return $.param(authParams);
    }
    
  function buildRefreshUrl(authCode) {
      // Generate random values for state and nonce
      refreshToken = tokenObj.refreshToken
    
      var authParams = {
        grant_type: "refresh_token",
        client_id: appId,
        redirect_uri: redirectUri,
        refresh_token: refreshToken,
        scope: scopes,
        client_secret: "<client secret>",
        
      };
      //logger(redirectUri)
      
        return $.param(authParams);
      }
function parseHashParams(hash) {
  var params = hash.split('#')[1].split('&');
  

  var paramarray = {};
  params.forEach(function(param) {
    param = param.split('=');
    paramarray[param[0]] = param[1];
  });

  return paramarray;
}


//code sourced from microsoft api tutorial.
function handleTokenResponse(hash) {
  // clear tokens
  

  var tokenresponse = hash;

  // Check that state is what we sent in sign in request
  
  tokenObj.accessToken = tokenresponse.access_token;
  tokenObj.refreshToken= tokenresponse.refresh_token;

  // Get the number of seconds the token is valid for,
  // Subract 5 minutes (300 sec) to account for differences in clock settings
  // Convert to milliseconds
  var expiresin = (parseInt(tokenresponse.expires_in) - 300) * 1000;
  var now = new Date();
  var expireDate = new Date(now.getTime() + expiresin);
  sessionStorage.tokenExpires = expireDate.getTime();
  tokenObj.tokenExpires = sessionStorage.tokenExpires;

  sessionStorage.idToken = tokenresponse.id_token;
  tokenObj.idToken = tokenresponse.id_token;
  validateIdToken(function(isValid) {
    if (isValid) {
      // Re-render token to handle refresh
      
    }
  })
}

function validateIdToken(callback) {
  // Per Azure docs (and OpenID spec), we MUST validate
  // the ID token before using it. However, full validation
  // of the signature currently requires a server-side component
  // to fetch the public signing keys from Azure. This sample will
  // skip that part (technically violating the OpenID spec) and do
  // minimal validation

  if (null == sessionStorage.idToken || sessionStorage.idToken.length <= 0) {
    callback(false);
  }

  // JWT is in three parts seperated by '.'
  var tokenParts = sessionStorage.idToken.split('.');
  if (tokenParts.length != 3){
    callback(false);
  }

  // Parse the token parts
  var header = KJUR.jws.JWS.readSafeJSONString(b64utoutf8(tokenParts[0]));
  var payload = KJUR.jws.JWS.readSafeJSONString(b64utoutf8(tokenParts[1]));
  

  // Check the nonce
  if (payload.nonce != sessionStorage.authNonce) {
    sessionStorage.authNonce = '';
    callback(false);
  }

  sessionStorage.authNonce = '';

  // Check the audience
  if (payload.aud != appId) {
    callback(false);
  }

  // Check the issuer
  // Should be https://login.microsoftonline.com/{tenantid}/v2.0
  if (payload.iss !== 'https://login.microsoftonline.com/' + payload.tid + '/v2.0') {
    callback(false);
  }

  // Check the valid dates
  var now = new Date();
  // To allow for slight inconsistencies in system clocks, adjust by 5 minutes
  var notBefore = new Date((payload.nbf - 300) * 1000);
  var expires = new Date((payload.exp + 300) * 1000);
  if (now < notBefore || now > expires) {
    callback(false);
  }

  // Now that we've passed our checks, save the bits of data
  // we need from the token.

  sessionStorage.userDisplayName = payload.name;
  sessionStorage.userSigninName = payload.preferred_username;
  tokenObj.userDisplayName = payload.name;
  tokenObj.userSigninName = payload.preferred_username;
 

  // Per the docs at:
  // https://azure.microsoft.com/en-us/documentation/articles/active-directory-v2-protocols-implicit/#send-the-sign-in-request
  // Check if this is a consumer account so we can set domain_hint properly
  sessionStorage.userDomainType =
    payload.tid === '"<redacted>"' ? 'consumers' : 'organizations';
  tokenObj.userDomainType=sessionStorage.userDomainType

  callback(true);
}


function save(key, value) {
  value = JSON.stringify(value)
  window.localStorage.setItem(key, value)
}

function open(key) {
  let object = window.localStorage.getItem(key)
  if (object == 'undefined' || !object) {
    return null
  }
  //logger('key and object', key, object)
  return JSON.parse(object)
}


  

