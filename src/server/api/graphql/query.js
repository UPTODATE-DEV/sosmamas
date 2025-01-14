var axios = require("axios").default;

const sequelize = require('sequelize');
const Op = sequelize.Op;
const { pubsub, SEARCH_POST } = require('./constants');
const userController = require('../controllers/user');

const getPagination = (page, size) => {
    const limit = size ? +size : 4;
    const offset = page ? page * limit : 0;

    return { limit, offset };
};

module.exports = ({
    async user(_, { phone }, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        const data = await models.User.findOne({ where: { phone: phone } });
        if (data) {
            return data;
        } else {
            return null;
        }
    },
    async phoneVerification(_, args, { models }) {
        console.log(args)
        if (args.phone.substring(0, 1) === "0") {
            args.phone = args.phone.substring(1, args.phone.length)
        }
        args.phone = `${args.countryCode}${args.phone}`

        const data = await models.User.findOne({ where: { phone: { [Op.substring]: args.phone } } });

        if (args.model.toString().toLowerCase() === 'password') {
            if (data) {
                const otpData = await userController.sendVerificationCode(args.phone)
                return otpData
            } else {
                throw new Error('Ce numéro de téléphone n\'existe pas');
            }
        } else {
            if (data) {
                throw new Error('Ce numéro de téléphone existe déjà\nVeuillez changer de numéro puis reéssayer');
            }
            const otpRes = await userController.sendVerificationCode(args.phone)
            
            if (otpRes['credetial']) {
                return otpRes
            }
            throw new Error("Veuillez vérifier votre numéro de téléphone s'il vous plait");
        }
    },
    async userResult(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }

        const { limit, offset } = getPagination(args.page, args.size);
        const data = await models.User.findAndCountAll({
            where: {
                status: args.status ? args.status : { [Op.ne]: null },
                visible: args.visible ? args.visible : { [Op.ne]: null },
            },
            include: [{
                model: models.Profile,
                required: args.query ? true : false,
                where: {
                    [Op.or]: {
                        firstName: { [Op.substring]: args.query || '' },
                        lastname: { [Op.substring]: args.query || '' },
                        name: { [Op.substring]: args.query || '' },
                        gender: { [Op.substring]: args.query || '' },
                        address: { [Op.substring]: args.query || '' },
                    }
                }
            }],

            offset: offset, limit: limit,
            order: args.visible ? sequelize.literal('rand()') : [['createdAt', 'DESC']],
        });
        const { count: totalItems, rows: users } = data;
        const currentPage = (args.page ? +args.page : 0) + 1;
        const totalPages = Math.ceil(totalItems / limit);
        const hasMore = currentPage < totalPages;
        const responseData = { totalItems, totalPages, currentPage, hasMore, users };
        return responseData;
    },
    async periode(_, { id }, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        return models.Periode.findOne({ where: { id: id } })
    },
    async periodes(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        return models.Periode.findAll({ where: args.status })
    },
    async conseil(_, args, { user, models }) {
        // if (!user) {
        //     throw new Error('Unauthenticated!');
        // }
        return models.Conseil.findOne({ where: { id: args.id } })

    },
    async conseils(_, __, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        return models.Conseil.findAll();
    },
    async conseilItems(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        return models.ConseilItem.findAll({ where: args });
    },
    async symptome(_, { id }, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        return models.Symptome.findOne({ where: { id: id } })
    },
    async symptomes(root, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        return models.Symptome.findAll({ where: args })
    },
    async post(_, { id }, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        const post = await models.Post.findOne({ where: { id: id } });
        return post;
    },
    async postResult(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }

        const { limit, offset } = getPagination(args.page, args.size);

        const data = await models.Post.findAndCountAll({
            where: {
                tagId: args.tagId || {
                    [Op.ne]: null
                },
                status: args.status ? args.status : { [Op.ne]: null },
                [Op.or]: {
                    title: { [Op.substring]: args.query || '' },
                    body: { [Op.substring]: args.query || '' }
                },
            },
            attributes: [`id`, `title`, `body`, `tagId`, `authorId`, `status`, `createdAt`, `updatedAt`],
            offset: offset, limit: limit,
            order: [['createdAt', 'DESC']],
        });

        const { count: totalItems, rows: posts } = data;
        const currentPage = (args.page ? +args.page : 0) + 1;
        const totalPages = Math.ceil(totalItems / limit);
        const hasMore = currentPage < totalPages;
        const responseData = { totalItems, totalPages, currentPage, hasMore, posts };

        if (args.query) {
            pubsub.publish(SEARCH_POST, { postResult: responseData });
        }

        return responseData;
    },
    async tag(_, { id }, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        return models.PostTag.findOne({ where: { id: id } })
    },
    async tags(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        const tags = await models.PostTag.findAll();
        return tags;
    },
    async comments(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        return models.Comment.findAll({
            attributes: [`id`, `content`, `userId`, `postId`, `status`, `createdAt`, `updatedAt`],
            where: {
                postId: args.postId, status: args.status || {
                    [Op.ne]: null
                },
            },
            order: [['createdAt', 'DESC']]
        })
    },
    async commentResult(_, args, { user, models }) {
        if (!user) {
            throw new Error('Unauthenticated!');
        }
        const { limit, offset } = getPagination(args.page, args.size);
        const data = await models.Comment.findAndCountAll({
            attributes: [`id`, `content`, `userId`, `postId`, `status`, `createdAt`, `updatedAt`],
            where: {
                postId: args.postId, status: args.status || {
                    [Op.ne]: null
                },
            },
            offset: offset, limit: limit,
            order: [['createdAt', 'DESC']]
        })

        const { count: totalItems, rows: comments } = data;
        const currentPage = (args.page ? +args.page : 0) + 1;
        const totalPages = Math.ceil(totalItems / limit);
        const hasMore = currentPage < totalPages;
        const responseData = { totalItems, totalPages, currentPage, hasMore, comments };

        return responseData;
    },
    async showDashboard(_, args, { models }) {
        return await models.Comment.count()
    },
})
