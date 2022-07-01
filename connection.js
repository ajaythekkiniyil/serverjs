const Constants=require('./const')

const MongoClient=require('mongodb').MongoClient;
const url=Constants.mongodbURL;

var state={
    dbo:null
}
module.exports.connect=()=>{
    MongoClient.connect(url,(err,db)=>{
        if(err) throw err;
        state.dbo=db.db(Constants.databaseName)
        console.log("Connected to database");
    })
}


module.exports.get=()=>{
    return state.dbo;
}