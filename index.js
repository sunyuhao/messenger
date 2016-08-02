'use strict'
//module requirement
const http = require('http')
const mongoose = require("mongoose")
const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const fs = require('fs')
const jsonUpdate = require('json-update')
    //property configeration
const app = express()
const config = require("./config/config.json") //page config file
    //for sending request for facebook, get
const token = config.pageAccessToken;
// for facebook weebhook verification // personalised string from MINI_bot in md5(sha1)
const pageVerifyToken = config.pageVerifyToken;
//for submite to remote webservice
const remoteToken = config.remoteToken;
//url for post to remote webservice
const post_url = config.post_url;
//port for server
const port = config.server_port;

const Users = require("./datasets/users");
const Dealers = require("./datasets/dealers");
const Cars = require("./datasets/cars");

mongoose.connect("mongodb://localhost:27017/bot_mini");

app.set('port', (process.env.PORT || port))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}))

// parse application/json
app.use(bodyParser.json())

// // index
// app.get('/', function(req, res) {
//     res.send('hello world i am a MINI bot')
// })


app.get('/webhook/', function(req, res) {
    if (req.query['hub.verify_token'] === pageVerifyToken) {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

// to post data
app.post('/webhook/', function(req, res) {
    let messaging_events = req.body.entry[0].messaging
    let askBook_Email = "Merci de nous confirmer votre E-MAIL pour que nous puissions vous envoyer la documentation sur le MINI"
    let askTestDrive_EmailPhone = "Merci de nous confirmer votre E-MAIL pour que nous puissions vous contacter pour la réservation."
    let notClickOldButton = "Je vous remercie de ne pas cliquer sur les boutons anciens s'il vous plaît."

    messagingEventLoop:
        for (let i = 0; i < messaging_events.length; i++) {
            let event = req.body.entry[0].messaging[i]
            let sender = event.sender.id
            let tempName = "./temp/temp" + sender + ".json";

            if (event.message && event.message.quick_reply) {
                sendTypeAction(sender);

                if (event.message.quick_reply.payload === "BROCHURE_THANKS") {
                    sendBookThanksMenu(sender)
                    continue;
                }
                if (event.message.quick_reply.payload === "REINPUT_EMAIL") {
                    sendTextMessage(sender, "Saisissez votre E-MAIL encore une fois s'il vous plaît.")
                    continue;
                }
            }


            if (event.message && event.message.text) {
                sendTypeAction(sender);
                let text = event.message.text
                let textPossible = ["J’obtiens", "j’essaie", "essaie", "essai", "brochure", "demande", "demandes", "essais", "essaies", "esai", "j’obtien", "j’essai", "jessai", "jobtiens"];
                for (let j = textPossible.length; j--;) {
                    if (text.indexOf(textPossible[j]) > -1) {
                        sendMenu(sender)
                        break messagingEventLoop;
                    }
                }
                let textPossible2 = ["bonjour", "Bonjour", "salut", "Salut", "Hi", "hi", "Hello", "hello", "Hey", "hey"];
                for (let j = textPossible2.length; j--;) {
                    if (text.indexOf(textPossible2[j]) > -1) {
                        let textTemplate2 = ["Bonjour, comment allez-vous ?", "Bonjour, ça va?", "Bonjour, je suis MINI-Bot, ça va?"];
                        let randWords2 = textTemplate2[Math.floor(Math.random() * textTemplate2.length)];
                        sendTextMessage(sender, randWords2)
                        break messagingEventLoop;
                    }
                }
                let textPossible3 = ["How are you", "ça va?", "Ca va?", "ça va ?", "Ca va ?", "ca va ?", "ca va?", "Comment allez-vous", "comment allez-vous"];
                for (let j = textPossible3.length; j--;) {
                    if (text.indexOf(textPossible3[j]) > -1) {
                        let textTemplate3 = ["Je vais bien et vous ?", "Ca va et vous ?"];
                        var randWords3 = textTemplate3[Math.floor(Math.random() * textTemplate3.length)];
                        sendTextMessage(sender, randWords3)
                        break messagingEventLoop;
                    }
                }

                let textPossible4 = ["et toi", "et vous", "ettoi", "etvous"];
                for (let j = textPossible4.length; j--;) {
                    if (text.indexOf(textPossible4[j]) > -1) {
                        let textTemplate4 = ["Je vais bien, merci!", "Merci pour votre sollicitation, je vais bien :), merci!"];
                        var randWords4 = textTemplate4[Math.floor(Math.random() * textTemplate4.length)];
                        sendTextMessage(sender, randWords4)
                        sendMenu(sender)
                        break messagingEventLoop;
                    }
                }


                if (validateZipcode(text)) { // after input a zipcode
                    fs.exists(tempName, function(exists) {
                        if (exists) {
                            getUserInfo(sender, null, null, text)
                            sendChooseDealerButton(sender, text)
                        } else {
                            sendMenu(sender)
                        }
                    })
                    continue;
                }

                if (validateEmail(text)) { // after input an email
                    fs.exists(tempName, function(exists) {
                        if (exists) {
                            getUserInfo(sender, text, null, null)
                            emailUsageMenu(sender, text);
                        } else {
                            sendMenu(sender)
                        }
                    })
                    continue;
                }
                if (validatePhone(text)) { // after input a phone number
                    fs.exists(tempName, function(exists) {
                        if (exists) {
                            getUserInfo(sender, null, text, null)
                            testDriveConfirmButton(sender, text)
                        } else {
                            sendMenu(sender)
                        }
                    })
                    continue;
                }
                sendMenu(sender)
                continue
            }

            if (event.postback) {
                console.log(event);
                if (event.postback.payload === "WELCOME") {
                    sendWelcomMessage(sender)
                    getUserInfo(sender)
                    continue;
                }
                if (event.postback.payload === "START") { // After click the 'Start chatting' button
                    sendMenu(sender)
                    getUserInfo(sender)
                    continue;
                } else if (event.postback.payload === "BROCHURE") { // After Choose demand de brochure
                    getUserInfo(sender)
                    sendGenericBookMessage(sender)
                    continue;
                } else if (event.postback.payload === "ESSAI") { //After Choose demand d'essai
                    getUserInfo(sender)
                    sendGenericTestDriveMessage(sender)
                    continue;
                } else if (event.postback.payload.indexOf("BOOK_") > -1) { // After select a book for a car
                    fs.exists(tempName, function(exists) {
                        if (exists) {
                            let book = event.postback.payload
                            let bookInfo = book.split('_')
                            let bookName = bookInfo[1].toLowerCase();
                            manageBook(sender, askBook_Email, bookName)
                        } else {
                            sendTextMessage(sender, notClickOldButton)
                            sendMenu(sender)
                        }
                    })
                    continue;
                } else if (event.postback.payload.indexOf("TEST_DRIVE_") > -1) { // After select a car for a test drive
                    fs.exists(tempName, function(exists) {
                        if (exists) {
                            let car = event.postback.payload
                            let carInfo = car.split('_')
                            let carName = carInfo[2].toLowerCase()
                            let carLine = carInfo[carInfo.length - 1].toUpperCase()
                            sendAskforZipCodeMessage(sender, "Entrez votre CODE POSTAL s'il vous plaît!", carName, carLine)
                        } else {
                            sendTextMessage(sender, notClickOldButton)
                            sendMenu(sender)
                        }
                    })
                    continue;
                } else if (event.postback.payload.indexOf("DEALER_") > -1) { // After select a dealer
                    fs.exists(tempName, function(exists) {
                        if (exists) {
                            let dealer = event.postback.payload
                            let dealerName = dealer.replace(/DEALER_/, "");
                            dealerName = dealerName.replace(/_DEALERID_\d+/, "");
                            dealerName = dealerName.replace(/_/g, " ");
                            let dealerId = dealer.match(/DEALERID_\d+/);
                            dealerId = dealerId[0].replace(/DEALERID_/, "");
                            manageTestDrive(sender, askTestDrive_EmailPhone, dealerName, dealerId)
                        } else {
                            sendTextMessage(sender, notClickOldButton)
                            sendMenu(sender)
                        }
                    })
                    continue;
                } else if (event.postback.payload === "EMAIL_FOR_BOOK") { // after input a email and choose for brochure
                    Users.findById(sender, function(err, userData) {
                            let email = userData.email
                            emailConfirmButtonBook(sender, email)
                        })
                        // let email = require("./users/" + sender + ".json").email
                        // emailConfirmButtonBook(sender, email)
                    continue;
                } else if (event.postback.payload === "EMAIL_FOR_TEST_DRIVE") { //after input a email and choose for essai
                    sendGenericTestDriveMessage(sender)
                    continue;
                } else if (event.postback.payload === "REINPUT_EMAIL") { // after select email not right
                    fs.exists(tempName, function(exists) {
                        if (exists) {
                            sendTextMessage(sender, "Saisissez votre E-MAIL encore une fois s'il vous plaît.")
                        } else {
                            sendTextMessage(sender, notClickOldButton)
                            sendMenu(sender)
                        }
                    })
                    continue;
                } else if (event.postback.payload === "REINPUT_ZIPCODE") { // after select email not right
                    fs.exists(tempName, function(exists) {
                        if (exists) {
                            sendTextMessage(sender, "Saisissez votre CODE POSTAL encore une fois s'il vous plaît.")
                        } else {
                            sendTextMessage(sender, notClickOldButton)
                            sendMenu(sender)
                        }
                    })
                    continue;
                } else if (event.postback.payload === "BROCHURE_THANKS") { // after select YES on confirm book message
                    fs.exists(tempName, function(exists) {
                        if (exists) {
                            sendBookThanksMenu(sender)
                        } else {
                            sendTextMessage(sender, notClickOldButton)
                            sendMenu(sender)
                        }
                    })
                    continue;
                } else if (event.postback.payload === "TEST_THANKS") { // after select YES on confirm test drive message
                    fs.exists(tempName, function(exists) {
                        if (exists) {
                            sendTestDriveThanksMenu(sender)
                        } else {
                            sendTextMessage(sender, notClickOldButton)
                            sendMenu(sender)
                        }
                    })
                    continue;
                }
                continue;
            }
        }
    res.sendStatus(200)
})

//validate Email
function validateEmail(email) {
    let re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

//validate Phone
function validatePhone(phone) {
    let re = /^(0[1-68])(?:[ _.-]?(\d{2})){4}$/;
    return re.test(phone);
}

//validate zipcode
function validateZipcode(zipcode) {
    let re = /^\d{2}[ ]?\d{3}$/
    return re.test(zipcode)
}

function getUserInfo(sender, email, phone, zipcode) {
    let Uemail = email
    let Uphone = phone
    let Uzipcode = zipcode
    let requestFields = "first_name,last_name,gender";
    request({
        uri: 'https://graph.facebook.com/v2.6/' + sender,
        method: 'GET',
        qs: {
            access_token: token,
            fields: requestFields,
        },
        headers: {
            'Content-Type': 'application/json'
        },
        json: true
    }, function(error, response, body) {
        if (error) {
            console.log(error);
        } else {
            let uFirstName = body.first_name
            let uLastName = body.last_name

            Users.findById(sender, function(err, userData) {
                    if (userData == null) {
                        body._id = sender
                        body.user_id = sender
                        body.utm_Campagne = "trackingCampagneFB"
                        body.utm_Medium = "trackingMediumFB"
                        body.utm_Source = "trackingSourceFB"
                        body.utm_Content = "trackingContentFB"
                        body.utm_Term = "trackingTermFB"
                        body.firstName = uFirstName
                        body.lastName = uLastName
                        if (body.gender == "male") {
                            body.civility = "m";
                        }
                        if (body.gender == "female") {
                            body.civility = "f";
                        }
                        let user = new Users(body)
                        user.save()
                    } else {
                        if (Uemail != null) {
                            saveEmailToJson(sender, Uemail)
                        }
                        if (Uphone != null) {
                            savePhoneToJson(sender, Uphone)
                        }
                        if (Uzipcode != null) {
                            saveZipcodeToJson(sender, Uzipcode)
                        }
                    }
                })
        }
    })
}

function sendTypeAction(sender) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: token
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            sender_action: "typing_on"
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendWelcomMessage(sender) {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "Bienvenue dans le monde de MINI!",
                    "item_url": "https://www.mini.fr",
                    "image_url": "https://www.mini.fr/etc/designs/minidigital-white/images/components/logo/mini-logo.232x98.png",
                    "subtitle": "Comment puis-je vous aider?",
                    "buttons": [{
                        "type": "web_url",
                        "title": "Voir le site",
                        "url": "https://www.mini.fr"
                    }, {
                        "type": "postback",
                        "title": "Démarrer",
                        "payload": "START"
                    }]
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: token
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}




function manageBook(sender, text, bookName) {
    sendAskforEmailForBookMessage(sender, text, bookName)
}

function manageTestDrive(sender, text, dealer, dealerId) {
    sendAskforEmailForTestDriveMessage(sender, text, dealer, dealerId)
}

function emailUsageMenu(sender, email) {
    fs.exists('./temp/temp' + sender + '.json', function(exists) {
        if (exists) {
            let stat = require('./temp/temp' + sender + '.json')
            let status = stat.status
            if (status == "essai") {
                emailConfirmButtonTestDrive(sender)
                return;
            }
            if (status == "brochure") {
                emailConfirmButtonBook(sender, email);
                return;
            }
        }
    })

}


function emailConfirmButtonTestDrive(sender) {
    let status = "essai"
    Users.findById(sender, function(err, userData) {
        let user = userData
        let carName = user.idLanding
        if (carName == undefined) {
            sendGenericTestDriveMessage(sender)
            return;
        }
        let messageData = {
            text: "Merci de nous confirmer votre NUMERO DE TELEPHONE pour que nous puissions vous contacter pour la réservation."
        }
        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {
                access_token: token
            },
            method: 'POST',
            json: {
                recipient: {
                    id: sender
                },
                message: messageData,
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending messages: ', error)
            } else if (response.body.error) {
                console.log('Error: ', response.body.error)
            }
            changeStatus(sender, status);
        })
    })
}



function testDriveConfirmButton(sender, phone) {
    Users.findById(sender, function(err, userData) {
        let user = userData
        let tipText = "Vous voulez demander d'essai?"
        let email = user.email
        let dealer = user.dealer
        let zipcode = user.zipcode
        let carName = user.idLanding
        let carLine = user.idCarline
        if (carName == undefined) {
            sendTextMessage(sender, tipText)
            sendGenericTestDriveMessage(sender)
            return;
        }

        if (zipcode == undefined) {
            sendTextMessage(sender, tipText)
            sendAskforZipCodeMessage(sender, "Entrez votre CODE POSTAL s'il vous plaît!", carName, carLine)
            return;
        }

        if (dealer == undefined) {
            sendTextMessage(sender, tipText)
            sendChooseDealerButton(sender, zipcode)
            return;
        }

        if (email == undefined) {
            sendAskforEmailForTestDriveMessage(sender, tipText + " Merci de nous confirmer votre E-MAIL pour que nous puissions vous contacter pour la réservation.", dealer)
            return;
        }
        let text = "Vous demandez d'essai pour:\n-------" + "MINI " + carName.substring(0, 1).toUpperCase() + carName.substring(1).toLowerCase() + "\nAvec des informations suivantes: \nE-mail:\n-------" + email + "\nNuméro de téléphone: \n-------" + phone + "\nCode postal: \n-------" + zipcode + "\nA la concession: \n-------" + dealer + ".\nC'est ce que vous voulez?"

        let messageData = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "button",
                    "text": text,
                    "buttons": [{
                        "type": "postback",
                        "title": "OUI",
                        "payload": "TEST_THANKS",
                    }, {
                        "type": "postback",
                        "title": "Information erronée",
                        "payload": "REINPUT_ZIPCODE",
                    }]
                }
            }
        }
        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {
                access_token: token
            },
            method: 'POST',
            json: {
                recipient: {
                    id: sender
                },
                message: messageData,
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending messages: ', error)
            } else if (response.body.error) {
                console.log('Error: ', response.body.error)
            }
        })

    })


}


function emailConfirmButtonBook(sender, email) {
    let status = "brochure"
    Users.findById(sender, function(err, userData) {
        let user = userData
        let bookName = user.book
        if (bookName == undefined) {
            sendGenericBookMessage(sender)
            return;
        }
        let messageData = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "button",
                    "text": "Je vais vous envoyer le brochure :\n-------" + "Brochure " + bookName.substring(0, 1).toUpperCase() + bookName.substring(1).toLowerCase() + "\nA cet e-mail : \n-------" + email + ".\nC'est ce que vous voulez?",
                    "buttons": [{
                        "type": "postback",
                        "title": "OUI",
                        "payload": "BROCHURE_THANKS",
                    }, {
                        "type": "postback",
                        "title": "E-mail erronée",
                        "payload": "REINPUT_EMAIL",
                    }]
                }
            }
        }

        let messageDatatest = {
            "text": "Je vais vous envoyer le brochure :\n-------" + "Brochure " + bookName.substring(0, 1).toUpperCase() + bookName.substring(1).toLowerCase() + "\nA cet e-mail : \n-------" + email + ".\nC'est ce que vous voulez?",
            "quick_replies": [{
                "content_type": "text",
                "title": "OUI",
                "payload": "BROCHURE_THANKS"
            }, {
                "content_type": "text",
                "title": "E-mail erronée",
                "payload": "REINPUT_EMAIL"
            }]
        }
        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {
                access_token: token
            },
            method: 'POST',
            json: {
                recipient: {
                    id: sender
                },
                message: messageData,
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending messages: ', error)
            } else if (response.body.error) {
                console.log('Error: ', response.body.error)
            }
            changeStatus(sender, status);
        })
    })

}

function saveEmailToJson(sender, email) {
    Users.findById(sender, function(err, userData) {
        let user = userData
        user.email = email
        user.save()
    })
}

function savePhoneToJson(sender, phone) {
    Users.findById(sender, function(err, userData) {
        let user = userData
        user.phone = phone
        user.save()
    })
}

function saveZipcodeToJson(sender, zipcode) {
    Users.findById(sender, function(err, userData) {
        let user = userData
        user.zipcode = zipcode
        user.save()
    })
}

function saveBookToJson(sender, bookName) {
    Users.findById(sender, function(err, userData) {
        let user = userData
        user.book = bookName
        user.save()
    })
}

function saveCarToJson(sender, carName, carLine) {
    Users.findById(sender, function(err, userData) {
        let user = userData
        user.idLanding = carName
        user.idCarline = carLine
        user.save()
    })
}

function saveDealerToJson(sender, dealer, dealerId) {
    Users.findById(sender, function(err, userData) {
        let user = userData
        user.dealer = dealer
        user.dealer_id = dealerId
        user.save()
    })
}

function changeStatus(sender, status) {
    let tempFilename = './temp/temp' + sender + '.json'
    let temp = new Object();

    fs.writeFile(tempFilename, JSON.stringify(temp, null, 4), function(err) {
        if (err) {
            console.log(err);
        } else {
            jsonUpdate.update(tempFilename, {
                status: status
            })
            console.log("User temp created to " + tempFilename);
        }
    })

}

function removeStatus(sender) {
    let tempFilename = './temp/temp' + sender + '.json'
    fs.unlink(tempFilename);
}

function pickDealer(zipcode,dealersData) {
    let department = zipcode.substring(0, 2);

    let dealers = JSON.parse(JSON.stringify(dealersData))
  // let dealers = require('./library/dealerlist.json')

    for (let i in dealers) {
        let dealerDep = JSON.parse(JSON.stringify(dealers[i].groupe)) //obj
        if (dealerDep.substring(0, 2) == department) {
            let dealer = generateDealer(dealers[i]);
            return dealer;
        }
    }
}

function generateDealer(dealer) {
    let dealers = dealer.options;
    var elements = [];
    let title = "Glisser pour choisisser le concession au départment : "
    for (let i in dealers) {
        let dealerName = JSON.parse(JSON.stringify(dealers[i].name))
        let dealerId = JSON.parse(JSON.stringify(dealers[i].value))
        let dealerPayload = "DEALER_" + dealerName.replace(/ /g, "_") + "_DEALERID_" + dealerId
        let element = {
            "title": title + dealer.groupe,
            "buttons": [{
                "type": "postback",
                "title": dealerName,
                "payload": dealerPayload,
            }]
        };
        elements.push(element);
    }
    return elements;
}

function sendChooseDealerButton(sender, zipcode) {

Dealers.find({},function(err,dealersData){

      if (pickDealer(zipcode,dealersData) == undefined) {
          sendTextMessage(sender, "Sorry,there is no dealer in your region!")
          sendMenu(sender);
          return;
      }
      let title = "Glisser pour choisisser le concession au départment : "
      let elements = pickDealer(zipcode,dealersData)
      let messageData = {
          "attachment": {
              "type": "template",
              "payload": {
                  "template_type": "generic",
                  "elements": elements
              }
          }
      }
      request({
          url: 'https://graph.facebook.com/v2.6/me/messages',
          qs: {
              access_token: token
          },
          method: 'POST',
          json: {
              recipient: {
                  id: sender
              },
              message: messageData,
          }
      }, function(error, response, body) {
          if (error) {
              console.log('Error sending messages: ', error)
          } else if (response.body.error) {
              console.log('Error: ', response.body.error)
          }
      })
    })
}

function pickCars(buttonTitle, payloadTitle, cars) {
    // let cars = require('./library/landings.json');
    var elements = [];
    for (let i in cars) {
        let carName  = JSON.parse(JSON.stringify(cars[i].idLanding))
        let carLine  = JSON.parse(JSON.stringify(cars[i].idCarline))
        let carDes   = JSON.parse(JSON.stringify(cars[i].description))
        let pageUrl  = JSON.parse(JSON.stringify(cars[i].page_url))
        let imageUrl = JSON.parse(JSON.stringify(cars[i].image_url))

        let element = {
            "title": "MINI " + carName,
            "subtitle": carDes,
            "item_url": pageUrl,
            "image_url": imageUrl,
            "buttons": [{
                "type": "postback",
                "title": buttonTitle,
                "payload": payloadTitle + carName.toUpperCase() + "_IDCARLINE_" + carLine
            }, {
                "type": "web_url",
                "title": "Voir le site",
                "url": pageUrl
            }]
        }
        elements.push(element);
    }
    return elements;
}

function sendGenericBookMessage(sender) {
    Cars.find({},function(err,carsData){
      let status = "brochure"
      let cars = carsData.sort({_id:1})
      let elements = pickCars("Demande de brochure", "BOOK_", cars);
      let messageData = {
          "attachment": {
              "type": "template",
              "payload": {
                  "template_type": "generic",
                  "elements": elements
              }
          }
      }
      request({
          url: 'https://graph.facebook.com/v2.6/me/messages',
          qs: {
              access_token: token
          },
          method: 'POST',
          json: {
              recipient: {
                  id: sender
              },
              message: messageData,
          }
      }, function(error, response, body) {
          if (error) {
              console.log('Error sending messages: ', error)
          } else if (response.body.error) {
              console.log('Error: ', response.body.error)
          }
          changeStatus(sender, status);
      })
      sendTextMessage(sender, "Choisissez les véhicules que vous voulez demander de brochure")
     })
}

function sendGenericTestDriveMessage(sender) {
    Cars.find({},function(err,carsData){
      let status = "essai"
      let cars = carsData.sort({ _id:1 })
      let elements = pickCars("Demande d’essai", "TEST_DRIVE_",cars);
      let messageData = {
          "attachment": {
              "type": "template",
              "payload": {
                  "template_type": "generic",
                  "elements": elements
              }
          }
      }
      request({
          url: 'https://graph.facebook.com/v2.6/me/messages',
          qs: {
              access_token: token
          },
          method: 'POST',
          json: {
              recipient: {
                  id: sender
              },
              message: messageData,
          }
      }, function(error, response, body) {
          if (error) {
              console.log('Error sending messages: ', error)
          } else if (response.body.error) {
              console.log('Error: ', response.body.error)
          }
          changeStatus(sender, status);
      })
      sendTextMessage(sender, "Choisissez les voitures que vous voulez essayer")
    })
  }

//send text messages
function sendTextMessage(sender, text) {
    let messageData = {
        text: text
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: token
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}


function sendAskforZipCodeMessage(sender, text, carName, carLine) {
    let messageData = {
        text: text
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: token
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
        saveCarToJson(sender, carName, carLine);
    })
}

function sendAskforEmailForBookMessage(sender, text, bookName) {

    let messageData = {
        text: text + " " + bookName.substring(0, 1).toUpperCase() + bookName.substring(1).toLowerCase()
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: token
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
        saveBookToJson(sender, bookName);

    })
}

function sendAskforEmailForTestDriveMessage(sender, text, dealer, dealerId) {

    let messageData = {
        text: text
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: token
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
        saveDealerToJson(sender, dealer, dealerId);
    })
}


//sendMenu
function sendMenu(sender) {
    let welcomeText = "Comment puis-je vous aider ?"
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": welcomeText,
                "buttons": [{
                    "type": "postback",
                    "title": "Demande de brochure",
                    "payload": "BROCHURE",
                }, {
                    "type": "postback",
                    "title": "Demande d'essai",
                    "payload": "ESSAI",
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: token
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages:', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendBookThanksMenu(sender) {

    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": "Merci, vous allez recevoir la brochure d’ici peu.En attendant, souhaitez-vous aller plus loin ?",
                "buttons": [{
                    "type": "web_url",
                    "title": "Voir le site",
                    "url": "https://www.mini.fr"
                }, {
                    "type": "postback",
                    "title": "Demande d’essai",
                    "payload": "ESSAI"
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: token
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
        removeStatus(sender)
        submitProcess(sender)
    })
}


function sendTestDriveThanksMenu(sender) {

    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": "Merci, nous avons bien noté votre information. Vous serez contacté d’ici peu. En attendant, nous vous invitons à découvrir le site.",
                "buttons": [{
                    "type": "web_url",
                    "title": "Voir le site",
                    "url": "https://www.mini.fr"
                }, {
                    "type": "postback",
                    "title": "Demande de brochure",
                    "payload": "BROCHURE"
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: token
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
        removeStatus(sender)
        submitProcess(sender)
    })
}


function submitProcess(sender) {
    Users.findById(sender, function(err, userData) {
            let user = userData
            // user._token = remoteToken
            user.optin = "0"
            user.save()
            request({
              url: post_url,
              method: 'POST',
              data : user,
              headers: {
                "Content-Type": "application/json"
                }
            }, function(error, response, body) {
                if (error) {
                    console.log('Error sending messages: ', error)
                } else if (response.body.error) {
                    console.log('Error: ', response.body.error)
                }
                console.log(body);
            })
        })
      }


app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})
