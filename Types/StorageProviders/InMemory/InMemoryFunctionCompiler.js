$C('$data.storageProviders.InMemory.InMemoryFunctionCompiler', $data.Expressions.EntityExpressionVisitor, null, {
    constructor: function (provider) {
        this.provider = provider;
    },
    compile: function (expression, context) {
        this.Visit(expression, context);
    },

    VisitParametricQueryExpression: function (expression, context) {
        this.Visit(expression.expression, context);
    },
    VisitUnaryExpression: function (expression, context) {
        context.data += expression.resolution.mapTo;
        context.data += "(";
        this.Visit(expression.operand, context);
        context.data += ")";
    },
    VisitSimpleBinaryExpression: function (expression, context) {
        var self = this;
        if (expression.resolution.reverse) {
            context.data += "(";

            if (expression.resolution.name === 'in' && Array.isArray(expression.right.value)) {
                context.data += "[";
                expression.right.value.forEach(function (item, i) {
                    if (i > 0) context.data += ",";
                    self.Visit(item, context);
                });
                context.data += "]";
            } else {
                var right = this.Visit(expression.right, context);
            }
            context.data += expression.resolution.mapTo;
            var left = this.Visit(expression.left, context);
            if (expression.resolution.rightValue)
                context.data += expression.resolution.rightValue;
            context.data += ")";
        } else {
            context.data += "(";
            var left = this.Visit(expression.left, context);
            context.data += expression.resolution.mapTo;
            var right = this.Visit(expression.right, context);
            context.data += ")";
        }
    },

    VisitConstantExpression: function (expression, context) {
        var type = Container.resolveType(expression.type);
        var typeName = Container.resolveName(type);
        var converter = this.provider.fieldConverter.escape[typeName];
        context.data += converter ? converter(expression.value) : expression.value;
    },
    VisitMemberInfoExpression: function (expression, context) {
        context.data += ".";
        context.data += expression.memberName;
    },

    VisitComplexTypeExpression: function (expression, context) {
        this.Visit(expression.source, context);
        this.Visit(expression.selector, context);
    },

    VisitEntityExpression: function (expression, context) {
        context.lambda = getLambdaName(expression);
        context.data += getPropertyName(expression);

        this.Visit(expression.source, context);

        /**
         * Recursively gets the property name.
         * Eg: 'thing.Category.Item.Id'.
         * @param expression
         * @returns {string}
         */
        function getPropertyName(expression){
            if(expression.selector && expression.selector.lambda){
                return expression.selector.lambda;
            }
            else if(expression.source.nodeType === 'EntitySet' && expression.source.selector.associationInfo.ToMultiplicity === '0..1'){
                return getPropertyName(expression.source.source) + '.' + expression.source.selector.associationInfo.FromPropertyName;
            }
        }

        /**
         * Recursively gets the lambda name.
         * Eg: 'thing'.
         * @param expression
         * @returns {string|undefined}
         */
        function getLambdaName(expression){
            if(expression.selector && expression.selector.lambda){
                return expression.selector.lambda;
            }
            else if(expression.source){
                return getLambdaName(expression.source);
            }
            return undefined;
        }
    },
    VisitEntitySetExpression: function () { },
    VisitObjectLiteralExpression: function (expression, context) {
        context.data += '{ ';

        for (var i = 0; i < expression.members.length; i++) {
            var member = expression.members[i];

            if (i > 0)
                context.data += ', ';

            this.Visit(member, context);
        }

        context.data += ' }';
    },
    VisitObjectFieldExpression: function (expression, context) {
        context.data += expression.fieldName + ': ';
        this.Visit(expression.expression, context);
    },
    VisitEntityFieldOperationExpression: function (expression, context) {
        Guard.requireType("expression.operation", expression.operation, $data.Expressions.MemberInfoExpression);

        //TODO refactor!
        var opDef = expression.operation.memberDefinition;
        if (opDef.propertyFunction) {
            this.Visit(expression.source, context);
            context.data += '.';
        }

        var opName = opDef.mapTo || opDef.name;
        context.data += opName;
        var paramCounter = 0;
        var params = opDef.parameters || [];

        var args = params.map(function (item, index) {
            if (item.name === "@expression") {
                return expression.source;
            } else {
                return expression.parameters[paramCounter++]
            };
        });

        args.forEach(function (arg, index) {
            if (arg) {
                if (index > 0) {
                    context.data += ",";
                };
                this.Visit(arg, context);
            }
        }, this);
        context.data += opDef.rightValue || "";
    }
});

