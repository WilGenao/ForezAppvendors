"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const reviews_service_1 = require("./reviews.service");
const create_review_dto_1 = require("./dto/create-review.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let ReviewsController = class ReviewsController {
    constructor(reviewsService) {
        this.reviewsService = reviewsService;
    }
    listForBot(botId, page = 1, limit = 10) { return this.reviewsService.listForBot(botId, +page, +limit); }
    create(user, dto) { return this.reviewsService.create(user.sub, dto); }
};
exports.ReviewsController = ReviewsController;
__decorate([
    (0, common_1.Get)('bot/:botId'),
    __param(0, (0, common_1.Param)('botId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "listForBot", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_review_dto_1.CreateReviewDto]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "create", null);
exports.ReviewsController = ReviewsController = __decorate([
    (0, swagger_1.ApiTags)('reviews'),
    (0, common_1.Controller)({ path: 'reviews', version: '1' }),
    __metadata("design:paramtypes", [reviews_service_1.ReviewsService])
], ReviewsController);
//# sourceMappingURL=reviews.controller.js.map