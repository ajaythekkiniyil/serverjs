const bcrypt = require('bcrypt')
const connection = require('./connection')
const constants = require('./const')
const fs = require('fs')
const { resolve } = require('path')
const { ObjectId } = require('mongodb')

module.exports = {
    sanitizeInput: function (username, password) {
        const originalName = username;
        let strippedName = originalName.replace(/(<([^>]+)>)/gi, "");
        const originalPassword = password;
        let strippedPassword = originalPassword.replace(/(<([^>]+)>)/gi, "");

        return ({ strippedName, strippedPassword })
    },
    createUser: function (username, plainPassword) {
        return new Promise(async (resolve, reject) => {
            let userExist = await connection.get().collection(constants.userCollection).findOne({ username: username })
            if (userExist) {
                resolve({ userExist: true })
            }
            else {
                bcrypt.hash(plainPassword, 10, (err, hash) => {
                    let user = {
                        username: username,
                        password: hash,
                        designation: 'designation',
                        phone: '123XXXXXXX',
                        email: 'abc@gmail.com',
                        location: 'location',
                    }
                    connection.get().collection(constants.userCollection).insertOne(user, (err, resp) => {
                        console.log('user information added to database');
                        resolve({ userCreated: true })
                    })
                })
            }

        })
    },
    verifyAdmin: (username, password) => {
        return new Promise(async (resolve, reject) => {
            const adminExist = await connection.get().collection(constants.adminCollection).findOne({ username: username })
            if (adminExist) {
                await bcrypt.compare(password, adminExist.password).then(result => {
                    if (result) {
                        resolve({ verified: true, username: adminExist.username })
                    }
                    else resolve({ verified: false })
                })
            }
            resolve({ verified: false })
        })
    },
    verifyUser: (username, password) => {
        return new Promise(async (resolve, reject) => {
            const userExist = await connection.get().collection(constants.userCollection).findOne({ username: username })
            if (userExist) {
                await bcrypt.compare(password, userExist.password).then(result => {
                    if (result) {
                        resolve({ verified: true, user: userExist })
                    }
                    else resolve({ verified: false })
                })
            }
            resolve({ verified: false })
        })
    },
    createFolder: () => {
        const assetImagesFolder = __dirname + "/assetImages"
        const assetInvoiceFolder = __dirname + "/assetInvoice"
        const userImageFolder = __dirname + "/userImages"
        try {
            if (!fs.existsSync(assetImagesFolder)) {
                fs.mkdirSync(assetImagesFolder)
            }
            if (!fs.existsSync(assetInvoiceFolder)) {
                fs.mkdirSync(assetInvoiceFolder)
            }
            if (!fs.existsSync(userImageFolder)) {
                fs.mkdirSync(userImageFolder)
            }
        } catch (err) {
            console.error(err)
        }
    },
    storeAssetData: (details, uid) => {
        let d = new Date()

        let history = [{ 'createdTime': d.toString() }]
        return new Promise(async (resolve, reject) => {
            await connection.get().collection(constants.assetDetails).insertOne({ details, uid, history }, (err, resp) => {
                if (err) throw err
                else resolve({ inserted: true })
            })
        })
    },
    getAllAssets: () => {
        return new Promise(async (resolve, reject) => {
            const allAssets = await connection.get().collection(constants.assetDetails).find().toArray()
            resolve(allAssets)
        })
    },
    sendTotal: () => {
        return new Promise(async (resolve, reject) => {
            const totalAssets = await connection.get().collection(constants.assetDetails).countDocuments()
            const totalUsers = await connection.get().collection(constants.userCollection).countDocuments()
            const totalCamera = (await connection.get().collection(constants.assetDetails).find({ 'details.category': 'camera' }).toArray()).length
            const totalWires = (await connection.get().collection(constants.assetDetails).find({ 'details.category': 'wires' }).toArray()).length
            resolve({ totalAssets, totalUsers, totalCamera, totalWires })
        })
    },
    getOneAssetDetail: (uid) => {
        return new Promise(async (resolve, reject) => {
            let totalUsers = await connection.get().collection(constants.userCollection).find().toArray()
            connection.get().collection(constants.assetDetails).findOne({ uid: uid }).then(asset => {
                resolve({ asset, totalUsers })
            })
        })
    },
    updateAsset: ({ asset, uid, date, assetHolder }) => {
        return new Promise(async (resolve, reject) => {
            await connection.get().collection(constants.assetDetails)
                .updateMany({ uid: uid },
                    {
                        $set: {
                            'details.device_name': asset.device_name,
                            'details.category': asset.category,
                            'details.brand_name': asset.brand_name,
                            'details.location': asset.location,
                            'details.memory': asset.memory,
                            'details.processor': asset.processor,
                            'details.graphics': asset.graphics,
                            'details.refference_tag': asset.refference_tag,
                            'details.serial_no': asset.serial_no,
                            'details.model_name': asset.model_name,
                            'details.company_service_tag': asset.company_service_tag,
                            'details.model_no': asset.model_no,
                            'details.aoc_tag_no': asset.aoc_tag_no,
                            'details.start_date': asset.start_date,
                            'details.end_date': asset.end_date,
                            'details.invoice_no': asset.invoice_no,
                            'details.status': asset.status,
                            'details.notes': asset.notes,
                            'details.asset_holder': assetHolder,
                        }
                    }
                )
            await connection.get().collection(constants.assetDetails).updateOne({ uid: uid },
                {
                    $push: {
                        'history': {
                            'user': assetHolder,
                            'updatedTime': date,
                        }
                    }
                })

        })
    },
    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            const allUsers = await connection.get().collection(constants.userCollection).find({}).toArray()
            resolve(allUsers)
        })
    },
    updateUserDetails: (uid, details) => {
        return new Promise(async (resolve, reject) => {
            await connection.get().collection(constants.userCollection)
                .updateOne({ _id: ObjectId(uid) }, {
                    $set: {
                        'username':details.username,
                        'designation': details.designation,
                        'phone': details.phone,
                        'email': details.email,
                        'location': details.location,
                    }
                })
            resolve(true)
        })
    },
    getUserInfo: (username) => {
        return new Promise(async (resolve, reject) => {
            const userInfo = await connection.get().collection(constants.userCollection).findOne({ username: username })
            resolve(userInfo)
        })
    },
    getAssetHoldings: (username) => {
        return new Promise(async (resolve, reject) => {
            const assetHoldings = await connection.get().collection(constants.assetDetails).find({ 'details.asset_holder': username }).toArray()
            resolve(assetHoldings)
        })
    },
    deleteAsset: function (uid) {
        return new Promise((async (resolve, reject) => {
            await connection.get().collection(constants.assetDetails).deleteOne({uid:uid})
            resolve('deleted')
        }))
    },
    auditAsset: async(newDetails,callback)=>{
        if(newDetails.checked){
            await connection.get().collection(constants.assetDetails).updateOne({uid:newDetails.uid},{
                $set:{
                    "details.location":newDetails.location,
                }
            })
        }
        const resp = await connection.get().collection(constants.assetDetails).updateOne({uid:newDetails.uid},{
            $push:{
                audits:{
                    'previousAudit':newDetails.auditedDate,
                    'nextAudit':newDetails.nextAudit,
                    'notes':newDetails.notes,
                }
            }
        })
        if(resp) callback(true)
        else callback(false)
    }
}