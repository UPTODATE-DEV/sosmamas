require('dotenv').config();

const { pubsub, NEW_PERIODE, NEW_POST, NEW_COMMENT } = require('./constants');
var uniqid = require('uniqid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const axios = require('axios')
const sequelize = require('sequelize');
const Op = sequelize.Op;
// const fs = require('fs');
// const path = require('path');

function makeid(length) {
    var result = '';
    var characters = '0123456789098765432101234567890987654321';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

module.exports = ({
    async updatePeriode(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        if (args.id) {
            const periode = await models.Periode.findOne({ where: { id: args.id } });
            if (periode) {
                const update = periode.update(args, { where: { id: args.id } });

                return update;
            } else {
                throw new Error('Not Fount!');
            }
        }
        let newPeriode = models.Periode.create({ name: args.name });
        pubsub.publish(NEW_PERIODE, { newPeriode });
        return newPeriode;
    },
    async updateConseil(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        if (args.id) {
            const conseil = await models.Conseil.findOne({ where: { id: args.id } });
            if (conseil) {
                const update = conseil.update(args, { where: { id: args.id } });

                return update;
            } else {
                throw new Error('Not Fount!');
            }
        }
        return models.Conseil.create(args);
    },
    async updateConseilItem(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        if (args.id) {
            const conseilItem = await models.ConseilItem.findOne({ where: { id: args.id } });
            if (conseilItem) {
                const update = conseilItem.update(args, { where: { id: args.id } });

                return update;
            } else {
                throw new Error('Not Fount!');
            }
        }
        return models.ConseilItem.create(args);
    },
    async updateSymptome(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        if (args.id) {
            const symptome = await models.Symptome.findOne({ where: { id: args.id } });
            if (symptome) {
                const update = symptome.update(args, { where: { id: args.id } });
                return update;
            } else {
                throw new Error('Not Fount!');
            }
        }
        return models.Symptome.create(args);
    },
    async updatePostTag(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        if (args.id) {
            const postTag = await models.PostTag.findOne({ where: { id: args.id } });
            if (postTag) {
                const update = postTag.update(args, { where: { id: args.id } });
                return update;
            } else {
                throw new Error('Not Fount!');
            }
        }
        return models.PostTag.create({ id: uniqid(''), name: args.name });
    },
    async updatePost(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        if (args.id) {
            const post = await models.Post.findOne({ attributes: [`id`, `title`, `body`, `tagId`, `authorId`, `status`, `createdAt`, `updatedAt`], where: { id: args.id } });
            if (post) {
                const update = post.update(args, { where: { id: args.id } });

                pubsub.publish(NEW_POST, { newPost: update });
                return update;
            } else {
                throw new Error('Not Fount!');
            }
        }
        const newPost = await models.Post.create({ id: uniqid(''), title: args.title, body: args.body, tagId: args.tagId, authorId: user.userId });

        pubsub.publish(NEW_POST, { newPost });
        return newPost;
    },
    async updateComment(_, args, { user, models }) {
        // if (!user) {
        //     throw new Error('Unauthenticated!');
        // }
        if (args.id) {
            const comment = await models.Comment.findOne({
                attributes: [`id`, `content`, `userId`, `postId`, `status`, `createdAt`, `updatedAt`],
                where: { id: args.id }
            });
            if (comment) {
                const update = await comment.update(args, {
                    where: { id: args.id }
                });

                pubsub.publish(NEW_COMMENT, { newComment: update });
                return update;
            } else {
                throw new Error('Not Fount!');
            }
        }
        const newComment = await models.Comment.create({ id: uniqid(''), content: args.content, postId: args.postId, userId: user.userId });
        pubsub.publish(NEW_COMMENT, { newComment: newComment });
        return newComment;
    },
    async profile(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        return await models.Profile.findOrCreate({
            where: { userId: args.userId },
            args
        }).then(([result, created]) => {
            console.log(created);
            if (created) {
                return created;
            } else {
                const update = result.update(
                    args,
                    { where: { userId: user.userId } }
                );
                return update;
            }
        });
    },
    async updateUser(_, args, { user, models, fileName }) {
        // if (!user && !args.restore) {
        //     throw new Error('Unauthenticated!');
        // }
        if (args.restore) {
            console.log(args)
            const restorePassword = await models.User.findOne({
                where: { phone: args.phone }
            });

            if (restorePassword) {
                const password = await bcrypt.hash(args.password, 12);
                args.password = password;

                const newUserPassword = await restorePassword.update({ password: password }, {
                    where: {
                        phone: args.phone
                    }
                })
                return newUserPassword
            }
            throw new Error('Unauthenticated!');
        }
        if (args.oldPassword) {
            const userPassword = await models.User.findOne({
                where: { id: user.userId, phone: args.phone }
            });

            if (userPassword) {
                const isEqual = await bcrypt.compare(args.oldPassword, userPassword.password);

                if (!isEqual) {
                    throw new Error('Ancien mot de passe incorrect');
                }
                const password = await bcrypt.hash(args.password, 12);
                args.password = password;

                const newUserPassword = await userPassword.update({ password: password }, {
                    where: {
                        phone: args.phone
                    }
                })
                return newUserPassword
            }
            throw new Error('ce compte n\'existe pas!');
        }
        let hashedPassword;
        if (args.password) {
            hashedPassword = await bcrypt.hash(args.password, 12);
            args.password = hashedPassword;
        }
        if (args.id) {
            const existingUser = await models.User.findOne({ where: { id: args.id } });
            if (existingUser) {

                if(args.phone){
                    const existingPhone = await models.User.findOne({ where: { phone: args.phone } });
                    if(existingPhone){
                        if(existingPhone.id != args.id){
                            throw new Error("ce numero a déjà été utilisé par un autre compte.")
                        }
                    }
                }
                const updatedUser = await existingUser.update(args, { where: { id: args.id } });

                const existingProfile = await models.Profile.findOne({ where: { userId: updatedUser.id, } });
                if (existingProfile) {
                    args.userId = updatedUser.id;
                    await existingProfile.update(args, { where: { userId: updatedUser.id } });
                    return updatedUser;
                }
            }

        } else {
            const existingUser = await models.User.findOne({ where: { phone: args.phone } });
            if (existingUser) {
                throw new Error('Ce numéro de téléphone existe déjà');
            }
            const _user = await models.User.create({
                id: uniqid(''),
                phone: args.phone,
                username: `${args.firstName}${args.lastName || args.name}` + makeid(3),
                password: hashedPassword
            });
            args.userId = _user.id;
            await models.Profile.create(args);
            return _user;
        }

    },
    async otpValidation(_, args, { models }) {
        const data = await models.OtpVerification.findOne({
            where: {
                phoneNumber:{ [Op.substring]: args.phoneNumber },
                otpCode: args.otpCode,
                credetial: args.credetial
            }
        })
        if (data) {
            if (data.isVerifed === true) {
                throw new Error('Ce code est déjà utilisé');
            }
            await data.update({ isVerifed: false })
            const user = await models.User.findOne({ where: { phone: { [Op.substring]: args.phoneNumber } } });
            return user;
        } else {
            throw new Error('Ce code ne correspond pas');
        }
    },
    async login(_, args, { models }) {
        if (args.userID.substring(0, 1) === "0") {
            args.userID = args.userID.substring(1, args.userID.length);
        }
        const user = await models.User.findOne({
            where: { [Op.or]: { phone: { [Op.substring]: args.userID }, username: args.userID } }
        });

        if (user !== null) {
            if (user.status == false) {
                throw new Error('Ce compte est désactivé');
            }
            const isEqual = await bcrypt.compare(args.password, user.password);

            if (!isEqual) {
                throw new Error('Mot de passe incorrect');
            }
            const token = jwt.sign(
                { userId: user.id, phone: user.phone, device_id: args.device_id },
                process.env.ACCESS_TOKEN || "somesecretkey",
                // {
                //     expiresIn: '1h'
                // }
            );
            const tokenLog = await models.Tokenlog.findOne({ where: { device_id: args.device_id } });
            if (tokenLog) {
                tokenLog.update({
                    device_id: args.device_id,
                    token: token
                }, { where: { device_id: args.device_id } });
            } else {
                models.Tokenlog.create({
                    device_id: args.device_id,
                    token: token
                });
            }

            return { userId: user.id, token: token, isLoggedIn: true };
        }
        throw new Error('Ce nom d\'utilisateur n\'existe pas');
    },
    async logout(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        const token = await models.Tokenlog.findOne({ where: { device_id: args.device_id } });

        if (token !== null) {
            await token.destroy({
                where: { device_id: args.device_id }
            });
            return { userId: user.userId, token: '', isLoggedIn: false };
        }
        throw new Error('Token not found!');
    },
    async likeResource(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        return await models.Like.findOrCreate({
            where: {
                userId: user.userId,
                resourceId: args.resourceId
            },
            args
        }).then(([result, created]) => {
            if (!created) {
                result.destroy({
                    where: {
                        userId: user.userId,
                        resourceId: args.resourceId
                    }
                });
            }
            if (args.model === "Post") {
                const post = models.Post.findOne({
                    where: { id: args.resourceId }
                });
                pubsub.publish('NEW_RESSOURCE_LIKE', { resoureLiked: post });
                return { post }
            } else {
                const comment = models.Post.findOne({
                    where: { id: args.resourceId }
                });
                pubsub.publish('NEW_RESSOURCE_LIKE', { resoureLiked: comment });
                return { comment }
            }
        });

    },
    async uploadFile(_, args, { user, models }) {
        return {
            filename: "",
            mimetype: "",
            encoding: "",
            path: ""
        }
    },
});