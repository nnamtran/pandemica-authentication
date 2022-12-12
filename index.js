require('dotenv').config()
const path = require('path')
 
PORT = process.env.PORT || 3000

const express = require('express')
const {MongoClient} = require('mongodb')
const {v4: uuidv4} = require('uuid')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const bcrypt = require('bcrypt')
const uri = "mongodb+srv://nnamtran:87422491243Nam@cluster0.w7tfk6i.mongodb.net/?retryWrites=true&w=majority";

const app = express()
app.use(cors())
app.use(express.json())
// account: nnamtran - 87422491243Nam
app.get('/test', (req, res, next) => {
    res.json('Hello to my app')
}) 

app.post('/signup', async(req, res) => {
    const client = new MongoClient(uri)
    const {email, password} = req.body

    const generateduserId = uuidv4()
    const hashedpassword = await bcrypt.hash(password, 10)

    try {
        await client.connect()
        const database = client.db('app-data')
        const users = database.collection('users')

        const existingUser = await users.findOne({email})

        if (existingUser) {
            return res.status(409).send('User already exists. Please Login')
        }
        const sanitizedEmail = email.toLowerCase()
        const data = {
            user_id: generateduserId,
            email: sanitizedEmail,
            hashed_password: hashedpassword
        }
        const insertedUser = await users.insertOne(data)

        const token = jwt.sign(insertedUser, sanitizedEmail, {
            expiresIn: 60 * 24,
        })

        res.status(201).json({token, userId: generateduserId})
    } catch(error) {
        console.log(error)
    }
})

app.post('/login', async(req, res) => {
    const client = new MongoClient(uri)
    const { email, password} = req.body

    try {
        await client.connect()
        const database = client.db('app-data')
        const users = database.collection('users')
        const user = await users.findOne({email})
        if (user == null) {
            res.send('Username not exist')
        } else {
            const correctPassword = await bcrypt.compare(password, user.hashed_password)
            if (user && correctPassword) {
                const token = jwt.sign(user, email, {
                    expiresIn: 60*24
                })
                res.status(201).json({token, userId: user.user_id})
            } else {
                res.send('Invalid Credential')
            }
        }
    } catch(error) {
        console.log(error)
    }  
})


app.get('/user', async (req, res) => {
    const client = new MongoClient(uri)
    const userId = req.query.userId
    // console.log(req.query)
    try {
        await client.connect()
        const database = client.db('app-data')
        const users = database.collection('users')

        const query = {user_id: userId}
        const user = await users.findOne(query)
        res.send(user)

    } finally {
        await client.close()
    }
})

app.put('/user', async (req, res) => {
    const client = new MongoClient(uri)
    const formData = req.body.formData
    try {
        await client.connect()
        const database = client.db('app-data')
        const users = database.collection('users')

        const query = {user_id: formData.user_id}
        const updateDocument = {
            $set: {
                first_name: formData.first_name,
                dob_day: formData.dob_day,
                dob_month: formData.dob_month,
                dob_year: formData.dob_year,
                gender_identity: formData.gender_identity,
                address: formData.address,
                mobile: formData.mobile,
                url: formData.url,
            }
        }
        const insertedUser = await users.updateOne(query, updateDocument)
        res.send(insertedUser)
    } finally {
        await client.close()
    }
})

if (process.env.NODE_ENV === "production") {
    app.use(express.static("client/build"));
    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
    });
}

app.listen(PORT, () => console.log('Server running on PORT' + PORT))