var User = require('./models/user');
var config = require('../config/database');
var jwt = require('jwt-simple');
// pass passport for configuration
var passport = require('passport');
require('../config/passport')(passport);

function getTodos(res) {

    res.send({'success': true, 'todos': []});
};

getToken = function (headers) {
    if (headers && headers.authorization) {
        var parted = headers.authorization.split(' ');
        if (parted.length === 2) {
            return parted[1];
        } else {
            return null;
        }
    } else {
        return null;
    }
};

getUser = function(token, callback) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
        userName: decoded.userName
    }, function (err, user) {
        callback(err, user);
    });
}

module.exports = function (app) {

    app.post('/api/signup', function (req, res) {
        var newUser = new User({
            userName: req.body.userName,
            email: req.body.email,
            password: req.body.password,
            categories: []
        });

        newUser.save(function (err) {
            if (err) {
                return res.json({success: false, msg: 'Username already exists.'});
            }
            res.json({success: true, msg: 'Successful! Created new user. Proceed to login.'});
        });
    });

    app.post('/api/authenticate', function (req, res) {
        User.findOne({userName: req.body.userName}, function (err, user) {
            if (err) {
                throw err;
            }
            if (!user) {
                res.send({success: false, msg: 'Authentication failed. User not found.'});
            } else {
                user.comparePassword(req.body.password, function (err, isMatch) {
                    if (isMatch && !err) {
                        // if user is found and password is right create a token
                        var token = jwt.encode(user, config.secret);
                        // return the information including token as JSON
                        res.json({success: true, token: 'JWT ' + token});
                    } else {
                        res.send({success: false, msg: 'Authentication failed. Wrong password.'});
                    }
                });
            }
        });
    });

    app.post('/api/categories', function(req, res) {
        var token = getToken(req.headers);
        if (token && token !== null) {
            getUser(token, function(err, user){
                if (err) throw err;
                if (user) {
                    var found = user.categories.find(function(category){
                        return category.title === req.body.title;
                    });
                    if(found) {
                        return res.json({success: false, msg: 'Category already present.'});
                    }
                    user.categories.push({title: req.body.title, tasks: []});
                    user.save(function (err) {
                        if (err) {
                            return res.json({success: false, msg: 'Error while adding category.'});
                        }
                        res.json({success: true, categories: user.categories});
                    });
                } else {
                    return res.status(403).send({success: false, msg: 'Authentication failed. User not found.'});
                }
            });
        } else {
            return res.status(403).send({success: false, msg: 'No token provided.'});
        }
    });

    app.get('/api/categories', function(req, res) {
        var token = getToken(req.headers);
        if(token && token !== null) {
            getUser(token, function(err, user){
                if (err) throw err;
                if (user) {
                    res.send({success: true, categories: user.categories})
                } else {
                    return res.status(403).send({success: false, msg: 'Authentication failed. User not found.'});
                }
            });
        } else {
            return res.status(403).send({success: false, msg: 'No token provided.'});
        }
    });

    // get all todos
    app.get('/api/todos', function (req, res) {
        // use mongoose to get all todos in the database
        var token = getToken(req.headers);
        if (token && token !== null) {
            getUser(token, function(err, user){
                if (err) throw err;
                if (user) {
                    getTodos(res);
                } else {
                    return res.status(403).send({success: false, msg: 'Authentication failed. User not found.'});
                }
            });
        } else {
            return res.status(403).send({success: false, msg: 'No token provided.'});
        }
    });

    // create todo and send back all todos after creation
    app.post('/api/todos', function (req, res) {

        // create a todo, information comes from AJAX request from Angular
        Task.create({
            text: req.body.text,
            done: false
        }, function (err, task) {
            if (err)
                res.send(err);

            // get and return all the todos after you create another
            getTodos(res);
        });

    });

    // delete a todo
    app.delete('/api/todos/:todo_id', function (req, res) {
        Task.remove({
            _id: req.params.todo_id
        }, function (err, todo) {
            if (err)
                res.send(err);

            getTodos(res);
        });
    });

    // application -------------------------------------------------------------
    app.get('*', function (req, res) {
        res.sendFile(__dirname + '/public/index.html'); // load the single view file (angular will handle the page changes on the front-end)
    });
};
