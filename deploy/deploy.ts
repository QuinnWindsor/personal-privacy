import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedWaterIntake = await deploy("WaterIntake", {
    from: deployer,
    log: true,
  });

  console.log(`WaterIntake contract: `, deployedWaterIntake.address);
};
export default func;
func.id = "deploy_waterIntake"; // id required to prevent reexecution
func.tags = ["WaterIntake"];

