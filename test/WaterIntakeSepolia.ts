import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { WaterIntake } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("WaterIntakeSepolia", function () {
  let signers: Signers;
  let waterIntakeContract: WaterIntake;
  let waterIntakeContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const WaterIntakeDeployement = await deployments.get("WaterIntake");
      waterIntakeContractAddress = WaterIntakeDeployement.address;
      waterIntakeContract = await ethers.getContractAt("WaterIntake", WaterIntakeDeployement.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("add daily intake of 500ml", async function () {
    steps = 8;

    this.timeout(4 * 40000);

    progress("Encrypting '500'...");
    const encryptedIntake = await fhevm
      .createEncryptedInput(waterIntakeContractAddress, signers.alice.address)
      .add32(500)
      .encrypt();

    progress(
      `Call addDailyIntake(500) WaterIntake=${waterIntakeContractAddress} handle=${ethers.hexlify(encryptedIntake.handles[0])} signer=${signers.alice.address}...`,
    );
    let tx = await waterIntakeContract
      .connect(signers.alice)
      .addDailyIntake(encryptedIntake.handles[0], encryptedIntake.inputProof);
    await tx.wait();

    progress(`Call WaterIntake.getTotalIntake()...`);
    const encryptedTotal = await waterIntakeContract.getTotalIntake();
    expect(encryptedTotal).to.not.eq(ethers.ZeroHash);

    progress(`Decrypting WaterIntake.getTotalIntake()=${encryptedTotal}...`);
    const clearTotal = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedTotal,
      waterIntakeContractAddress,
      signers.alice,
    );
    progress(`Clear WaterIntake.getTotalIntake()=${clearTotal}`);

    progress(`Call WaterIntake.getDayCount()...`);
    const encryptedDayCount = await waterIntakeContract.getDayCount();
    
    progress(`Decrypting WaterIntake.getDayCount()=${encryptedDayCount}...`);
    const clearDayCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedDayCount,
      waterIntakeContractAddress,
      signers.alice,
    );
    progress(`Clear WaterIntake.getDayCount()=${clearDayCount}`);

    expect(clearTotal).to.eq(500);
    expect(clearDayCount).to.eq(1);
  });
});

