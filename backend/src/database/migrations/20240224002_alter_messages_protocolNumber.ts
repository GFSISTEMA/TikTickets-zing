import { QueryInterface, DataTypes } from "sequelize"

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.changeColumn("Messages", "protocolNumber", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.changeColumn("Messages", "protocolNumber", {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    });
  }
}
