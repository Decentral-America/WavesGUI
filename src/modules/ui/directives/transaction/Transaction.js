(function () {
    'use strict';

    /**
     * @param Base
     * @param $filter
     * @param {ModalManager} modalManager
     * @param {INotification} notification
     * @param {Waves} waves
     * @param {User} user
     * @param {$rootScope.Scope} $scope
     * @return {Transaction}
     */
    const controller = function (Base, $filter, modalManager, notification,
                                 waves, user, $scope) {

        const { SIGN_TYPE } = require('@decentralchain/signature-adapter');
        class Transaction extends Base {

            $postLink() {
                this.typeName = this.transaction.typeName;
                this.setScam();

                this.receive(user.setScamSignal, () => {
                    this.setScam();
                    $scope.$apply();
                });
            }

            setScam() {
                this.isScam = !!user.scam[this.transaction.assetId];
                if (this.transaction.type === 7) {
                    const isScamAmount = !!user.scam[this.transaction.amount.asset];
                    const isScamPrice = !!user.scam[this.transaction.price.asset];
                    this.isScam = this.isScam || isScamAmount || isScamPrice;
                }
            }

            cancelLeasing() {
                const lease = this.transaction;
                const leaseId = lease.id;
                return waves.node.getFee({ type: SIGN_TYPE.CANCEL_LEASING })
                    .then((fee) => {
                        const tx = waves.node.transactions.createTransaction({
                            fee,
                            type: SIGN_TYPE.CANCEL_LEASING,
                            lease,
                            leaseId
                        });
                        const signable = ds.signature.getSignatureApi().makeSignable({
                            type: tx.type,
                            data: tx
                        });
                        return modalManager.showConfirmTx(signable);
                    });
            }

            showTransaction() {
                modalManager.showTransactionInfo(this.transaction.id);
            }

            /**
             * return {string}
             */
            getCopyAllData() {
                const tx = this.transaction;
                const id = `Transaction ID: ${tx.id}`;
                const type = `Type: ${tx.type} (${this.typeName})`;

                const timestamp = $filter('date')(tx.timestamp, 'MM/dd/yyyy HH:mm');
                const datetime = `Date: ${timestamp}`;

                let sender = `Sender: ${tx.sender}`;
                if (tx.typeName === WavesApp.TRANSACTION_TYPES.NODE.EXCHANGE) {
                    sender += ' (matcher address)';
                }

                let message = `${id}\n${type}\n${datetime}\n${sender}`;

                if (tx.typeName === WavesApp.TRANSACTION_TYPES.EXTENDED.UNKNOWN) {
                    message += '\n\nRAW TX DATA BELOW\n\n';
                    message += JSON.stringify(tx, null, 2);
                    return message;
                }

                if (tx.recipient) {
                    const recipient = `Recipient: ${tx.recipient}`;
                    message += `\n${recipient}`;
                }

                if (tx.amount && tx.amount instanceof ds.wavesDataEntities.Money) {
                    const asset = tx.amount.asset;
                    const amount = `Amount: ${tx.amount.toFormat()} ${asset.name} (${asset.id})`;
                    message += `\n${amount}`;
                }

                if (this.typeName === WavesApp.TRANSACTION_TYPES.EXTENDED.EXCHANGE_BUY ||
                    this.typeName === WavesApp.TRANSACTION_TYPES.EXTENDED.EXCHANGE_SELL) {
                    const asset = tx.price.asset;
                    const price = `Price: ${tx.price.toFormat()} ${asset.name} (${asset.id})`;
                    const totalPrice = `Total price: ${this.totalPrice} ${asset.name}`;
                    message += `\n${price}\n${totalPrice}`;
                }

                if (this.typeName === WavesApp.TRANSACTION_TYPES.EXTENDED.DATA) {
                    message += '\n\n\nDATA START';
                    message += `\n\n${tx.stringifiedData}`;
                    message += '\n\nDATA END\n\n';
                }

                const fee = `Fee: ${tx.fee.toFormat()} ${tx.fee.asset.name} (${tx.fee.asset.id})`;
                message += `\n${fee}`;

                return message;
            }

        }

        return new Transaction();
    };

    controller.$inject = [
        'Base',
        '$filter',
        'modalManager',
        'notification',
        'waves',
        'user',
        '$scope'
    ];

    angular.module('app.ui')
        .component('wTransaction', {
            bindings: {
                datePattern: '@',
                transaction: '<'
            },
            require: {
                parent: '^wTransactionList'
            },
            templateUrl: 'modules/ui/directives/transaction/transaction.html',
            transclude: false,
            controller
        });
})();
