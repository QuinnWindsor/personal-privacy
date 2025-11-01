import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact Locally (--network localhost)
 * ===========================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy the WaterIntake contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the WaterIntake contract
 *
 *   npx hardhat --network localhost task:decrypt-total
 *   npx hardhat --network localhost task:add-intake --value 500
 *   npx hardhat --network localhost task:decrypt-total
 *
 *
 * Tutorial: Deploy and Interact on Sepolia (--network sepolia)
 * ===========================================================
 *
 * 1. Deploy the WaterIntake contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the WaterIntake contract
 *
 *   npx hardhat --network sepolia task:decrypt-total
 *   npx hardhat --network sepolia task:add-intake --value 500
 *   npx hardhat --network sepolia task:decrypt-total
 *
 */

/**
 * Example:
 *   - npx hardhat --network localhost task:address
 *   - npx hardhat --network sepolia task:address
 */
task("task:address", "Prints the WaterIntake address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const waterIntake = await deployments.get("WaterIntake");

  console.log("WaterIntake address is " + waterIntake.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:decrypt-total
 *   - npx hardhat --network sepolia task:decrypt-total
 */
task("task:decrypt-total", "Calls the getTotalIntake() function of WaterIntake Contract")
  .addOptionalParam("address", "Optionally specify the WaterIntake contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const WaterIntakeDeployement = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("WaterIntake");
    console.log(`WaterIntake: ${WaterIntakeDeployement.address}`);

    const signers = await ethers.getSigners();

    const waterIntakeContract = await ethers.getContractAt("WaterIntake", WaterIntakeDeployement.address);

    const encryptedTotal = await waterIntakeContract.getTotalIntake();
    if (encryptedTotal === ethers.ZeroHash) {
      console.log(`encrypted total: ${encryptedTotal}`);
      console.log("clear total    : 0");
      return;
    }

    const clearTotal = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedTotal,
      WaterIntakeDeployement.address,
      signers[0],
    );
    console.log(`Encrypted total: ${encryptedTotal}`);
    console.log(`Clear total    : ${clearTotal} ml`);

    const encryptedDayCount = await waterIntakeContract.getDayCount();
    if (encryptedDayCount === ethers.ZeroHash) {
      console.log(`encrypted day count: ${encryptedDayCount}`);
      console.log("clear day count    : 0");
      return;
    }

    const clearDayCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedDayCount,
      WaterIntakeDeployement.address,
      signers[0],
    );
    console.log(`Encrypted day count: ${encryptedDayCount}`);
    console.log(`Clear day count    : ${clearDayCount}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:add-intake --value 500
 *   - npx hardhat --network sepolia task:add-intake --value 500
 */
task("task:add-intake", "Calls the addDailyIntake() function of WaterIntake Contract")
  .addOptionalParam("address", "Optionally specify the WaterIntake contract address")
  .addParam("value", "The daily intake value in ml")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const value = parseInt(taskArguments.value);
    if (!Number.isInteger(value)) {
      throw new Error(`Argument --value is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const WaterIntakeDeployement = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("WaterIntake");
    console.log(`WaterIntake: ${WaterIntakeDeployement.address}`);

    const signers = await ethers.getSigners();

    const waterIntakeContract = await ethers.getContractAt("WaterIntake", WaterIntakeDeployement.address);

    // Encrypt the value passed as argument
    const encryptedValue = await fhevm
      .createEncryptedInput(WaterIntakeDeployement.address, signers[0].address)
      .add32(value)
      .encrypt();

    const tx = await waterIntakeContract
      .connect(signers[0])
      .addDailyIntake(encryptedValue.handles[0], encryptedValue.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const newEncryptedTotal = await waterIntakeContract.getTotalIntake();
    console.log("Encrypted total after adding intake:", newEncryptedTotal);

    console.log(`WaterIntake addDailyIntake(${value} ml) succeeded!`);
  });

