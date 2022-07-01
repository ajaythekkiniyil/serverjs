const express = require('express')
const app = express()
const cors = require('cors')
const { json } = require('express')
const fileupload = require("express-fileupload");
require('dotenv').config()

const helper = require('./helper')
const connection = require('./connection')
const jwt = require('jsonwebtoken')
const Constants = require('./const');
const fileUpload = require('express-fileupload');
const { urlencoded } = require('body-parser');


app.use(cors())
app.use(express.json())
app.use(fileupload());

// React Build items connection
// app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//     next();
//   });

// const path = require('path');

// app.use(express.static(path.join(__dirname, 'build')));

// app.get('*', function (req, res) {
//   res.sendFile(path.join(__dirname, 'build', 'index.html'));
// }); 

// database connection
connection.connect()

app.post('/api/create-user', (req, res) => {
    //input sanitization username and password
    const credentials = helper.sanitizeInput(req.body.username, req.body.password)
    helper.createUser(credentials.strippedName, credentials.strippedPassword,).then(resp => {
        res.json(resp);
    })
})

app.post('/api/admin', (req, res) => {
    const credentials = helper.sanitizeInput(req.body.username, req.body.password)
    helper.verifyAdmin(credentials.strippedName, credentials.strippedPassword).then(resp => {
        if (resp.verified) {
            // 15 minutes expires jwt token
            const token = jwt.sign({
                username: resp.username
            }, Constants.random_texts, { expiresIn: 60 * 15 })
            res.json({ token: token, username: resp.username, verified: true })
        }
        else {
            res.json({ verified: false })
        }
    })
})
app.post('/api/user', (req, res) => {
    const credentials = helper.sanitizeInput(req.body.username, req.body.password)
    helper.verifyUser(credentials.strippedName, credentials.strippedPassword).then((resp) => {
        if (resp.verified) {
            let userInfo = {
                username: resp.user.username,
                designation: resp.user.designation,
                phone: resp.user.phone,
                email: resp.user.email,
                location: resp.user.location,
                id: resp.user._id + '',
            }
            // 15 minutes expires jwt token
            const token = jwt.sign({
                username: resp.user.username,
                designation: resp.user.designation,
                phone: resp.user.phone,
                email: resp.user.email,
                location: resp.user.location,
                id: resp.user._id + '',
            }, Constants.random_texts, { expiresIn: 60 * 15 })
            res.json({ token: token, userInfo, userVerified: true })
        }
        else {
            res.json({ userVerified: false })
        }
    })
})

app.get('/api/verify-admin', (req, res) => {
    console.log('call');
    const authToken = req.header('authToken')
    try {
        const verifiedToken = jwt.verify(authToken, Constants.random_texts)
        const adminInfo = verifiedToken;
        if (verifiedToken) {
            res.json({ adminInfo, adminVerified: true })
        }
        else (
            res.json({ adminVerified: false })
        )
    }
    catch (e) {
        res.json({ adminVerified: false })
    }
})
app.get('/api/verify-user', (req, res) => {
    const authToken = req.header('authToken')
    try {
        const verifiedToken = jwt.verify(authToken, Constants.random_texts)
        const userInfo = verifiedToken;
        if (verifiedToken) {
            res.json({ userInfo, userVerified: true })
        }
        else (
            res.json({ userVerified: false })
        )
    }
    catch (e) {
        res.json({ userVerified: false })
    }
})
app.post('/api/create-asset', (req, res) => {
    const file = req.files.file;
    const details = JSON.parse(req.body.details);
    const invoice = req.files.invoice;
    const uid = req.body.uid;
    // creating images folder
    helper.createFolder()
    // store asset image on server folder (assetImages)
    file.mv(`${__dirname}/assetImages/${uid}.jpg`, (err) => {
        if (err) throw err;
    });
    // store invoice on server folder (assetInvoice)
    invoice.mv(`${__dirname}/assetInvoice/${uid}.pdf`, (err => {
        if (err) throw err;
    }))
    // store asset data to database
    helper.storeAssetData(details, uid).then(inserted => {
        res.json({ inserted: true })
    })

})
app.get('/api/get-all-assets', (req, res) => {
    helper.getAllAssets().then(allAssets => {
        res.send(allAssets)
    })
})
app.get('/api/get-total-data', (req, res) => {
    helper.sendTotal().then(resp => {
        res.send(resp)
    })
})
app.get('/api/asset-details', (req, res) => {
    helper.getOneAssetDetail(req.query.uid).then(asset => {
        const uid = req.query.uid;
        const assetImgUrl = `${Constants.domainName + 'server/assetImages/' + uid + '.jpg'}`
        const invoiceUrl = `${Constants.domainName + 'server/assetInvoice/' + uid + '.pdf'}`
        asset.asset.details.imageUrl = '' || assetImgUrl
        asset.asset.details.invoiceUrl = invoiceUrl
        res.send(asset)
    })
        .catch((err) => {
            console.log(err);
        })
})
app.put('/api/update-asset', async (req, res) => {
    await helper.updateAsset(req.body)
    res.send('updated')
})
app.get('/api/get-all-users', (req, res) => {
    helper.getAllUsers().then(allUsers => res.send(allUsers))
})
// for user Profile 
app.get('/api/get-user-profile',(req,res)=>{
    helper.getUserInfo(req.query.username).then(userInfo=>{
        res.send(userInfo)
    })
})
app.post('/api/update-user-profile', (req, res) => {
    const image = req.files.image;
    const uid = req.body.uid;
    const details = JSON.parse(req.body.updatedUser);
    helper.createFolder()
    image.mv(__dirname + '\\userImages\\' + uid + '.jpg', (err) => {
        if (err) throw err;
    })
    helper.updateUserDetails(uid,details).then(resp=> console.log(resp))
    res.send('success')
})
app.get('/api/assets-holdings',(req,res)=>{
    const username=(req.query.username);
    helper.getAssetHoldings(username).then(resp=>{
        res.send(resp)
    })
})
app.delete('/api/delete-asset',(req,res)=>{
    const uid=req.body.uid
    helper.deleteAsset(uid).then(resp=>{
        res.send({deleted:true})
    })
})
app.post('/api/audit-asset',function(req,res){
    const auditedDate = req.body.auditedDate
    const toDayDate = new Date().getFullYear() + '-' + '0' + ((new Date().getMonth())+1) + '-' + new Date().getDate()
    helper.auditAsset(req.body,callback)
    function callback(resp){
        res.send(resp)
    }
})


const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log('server started'))