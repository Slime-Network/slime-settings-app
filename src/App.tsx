import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import { Box, Button, Chip, CircularProgress, Grid, IconButton, Modal, Paper, Stack, TextField, Typography } from "@mui/material";
import React from "react";

import { MainTopBar } from "./components/MainTopBar";
import { ProfileEditPage, ProfileEditPageProps } from "./gosti-shared/components/ProfileEditPage";
import { infoModalStyle } from "./gosti-shared/constants";
import { SocialLink } from './gosti-shared/constants/social-links';
import { useGostiApi } from './gosti-shared/contexts/GostiApiContext';
import { useWalletConnect } from "./gosti-shared/contexts/WalletConnectContext";
import { useWalletConnectRpc } from "./gosti-shared/contexts/WalletConnectRpcContext";
import { Profile } from "./gosti-shared/types/gosti/Profile";
import { WalletType } from "./gosti-shared/types/walletconnect/WalletType";
import { CreateNewDIDWalletRequest } from './gosti-shared/types/walletconnect/rpc/CreateNewDIDWallet';
import { FindLostDIDResponse } from './gosti-shared/types/walletconnect/rpc/FindLostDID';
import { GetDIDRequest, GetDIDResponse } from './gosti-shared/types/walletconnect/rpc/GetDID';
import { GetDIDInfoRequest, GetDIDInfoResponse } from './gosti-shared/types/walletconnect/rpc/GetDIDInfo';
import { GetWalletsRequest } from "./gosti-shared/types/walletconnect/rpc/GetWallets";
import { SetDIDNameRequest } from './gosti-shared/types/walletconnect/rpc/SetDIDName';
import { SignMessageByIdRequest } from './gosti-shared/types/walletconnect/rpc/SignMessageById';
import { UpdateDIDMetadataRequest, UpdateDIDMetadataResponse } from './gosti-shared/types/walletconnect/rpc/UpdateDIDMetadata';

export const App = () => {
	const {
		getWallets,
		getDID,
		getDIDInfo,
		// findLostDID,
		updateDIDMetadata,
		setDIDName,
		createNewDIDWallet,
		signMessageById,
	} = useWalletConnectRpc();

	const { client, session, pairings, connect, disconnect } = useWalletConnect();

	const { gostiConfig, setGostiConfig } = useGostiApi();

	const [profiles, setProfiles] = React.useState<Profile[]>([]);
	const [activeProfile, setActiveProfile] = React.useState<Profile | undefined>(undefined);
	const [loaded, setLoaded] = React.useState<boolean>(false);
	const [fee, setFee] = React.useState<number>(0);

	const [open, setOpen] = React.useState(false);

	const [openNotice, setOpenNotice] = React.useState(false);
	const [noticeTitle, setNoticeTitle] = React.useState<string | undefined>(undefined);
	const [noticeMessage, setNoticeMessage] = React.useState<string | undefined>(undefined);


	React.useEffect(() => {
		const getProfiles = async () => {
			if (profiles.length > 0) return;
			const getWalletsResult = await getWallets({ includeData: false } as GetWalletsRequest);
			const profs = [] as Profile[];
			// eslint-disable-next-line no-restricted-syntax -- Because
			for (const wallet of getWalletsResult) {
				if (wallet.type === WalletType.DecentralizedId) {
					console.log("wallet", wallet);
					// eslint-disable-next-line no-await-in-loop -- Because
					const did: GetDIDResponse = await getDID({ walletId: wallet.id } as GetDIDRequest);
					console.log("did", did);
					if (!did.coinId) {
						console.log(`no coin id for ${did.myDid} attempting to find it...`);

						// const foundDID: FindLostDIDResponse = await findLostDID({ coinId: did.myDid } as FindLostDIDRequest);
						const foundDID = { success: false } as FindLostDIDResponse;
						console.log("foundDID", foundDID);
						if (!foundDID.success) {
							console.log(`no coin id for ${did.myDid} found`);
						}
					};
					// eslint-disable-next-line no-await-in-loop -- Because
					const info: GetDIDInfoResponse = await getDIDInfo({ coinId: did.myDid } as GetDIDInfoRequest);
					console.log("info", info);
					// // eslint-disable-next-line no-await-in-loop -- Because
					// const metadata: GetDIDMetadataResponse = await getDIDMetadata({ walletId: wallet.id } as GetDIDMetadataRequest);
					// console.log("metadata", metadata);
					if (info.success) {
						const p = {
							name: wallet.name,
							did: did.myDid,
							coinId: did.coinId,
							p2Address: info.p2_address,
							walletId: wallet.id,
							metadata: info.metadata,
							coinAvailable: !!did.coinId,
						} as Profile;
						profs.push(p);
						console.log("profile", p);
					} else {
						console.log("error", info);
					}
				}
			}
			setLoaded(true);
			setProfiles(profs);
		};
		document.title = `Your Profiles`;
		if (session?.acknowledged && !profiles.length && profiles.length <= 0) {
			getProfiles();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- Because
	}, [getWallets, session]);


	const onConnect = () => {
		if (!client) throw new Error('WalletConnect is not initialized.');

		if (pairings.length === 1) {
			connect({ topic: pairings[0].topic });
		} else if (pairings.length) {
			console.log('The pairing modal is not implemented.', pairings);
		} else {
			connect();
		}
	};

	React.useEffect(() => {
		console.log("profiles", profiles);
		setProfiles(profiles);
	}, [profiles]);

	const onChangeName = async (name: string) => {
		if (!activeProfile) throw new Error("No active profile");
		const resp = await setDIDName({ walletId: activeProfile.walletId, name } as SetDIDNameRequest);
		console.log("resp name", resp);
		setNoticeTitle("Profile Name Updated");
		setNoticeMessage(`Your profile name was updated to: ${name} (This may require you to refresh your wallet to see the change.)`);
		setOpenNotice(true);
	};

	const onUpdateMetadata = async (metadata: any) => {
		if (!activeProfile) throw new Error("No active profile");
		const resp: UpdateDIDMetadataResponse = await updateDIDMetadata({ walletId: activeProfile?.walletId, metadata, fee } as UpdateDIDMetadataRequest);
		if (resp.success) {
			setNoticeTitle("Profile Metadata Updated");
			setNoticeMessage(`Your profile metadata was updated. It may take a few minutes for the transaction to be confirmed.`);
			setOpenNotice(true);
		} else {
			setNoticeTitle("Profile Metadata Update Failed");
			setNoticeMessage(`Your profile metadata update failed.`);
			setOpenNotice(true);
			console.log("resp error", resp);
		}
	};

	return (
		<Box>
			{MainTopBar(session, onConnect, disconnect)}
			<Grid container >
				<Grid item xs={3}>
					<Stack spacing={2} margin={2}>
						<Paper sx={{ p: 2 }}>
							<Grid container spacing={4}>
								<Grid item xs={12}>
									<Button variant="contained" sx={{ width: "100%" }} onClick={async () => {
										const result = await createNewDIDWallet({ amount: 1, backupDids: [], numOfBackupIdsNeeded: 1, fee } as CreateNewDIDWalletRequest);
										if (result.success) {
											setNoticeTitle("Profile Created!");
											setNoticeMessage(`Your profile was created with the following DID: ${result.myDid}`);
											setOpenNotice(true);
										} else {
											setNoticeTitle("Profile Creation Failed");
											setNoticeMessage(`Your profile creation failed. Error: ${(result as any).error}`);
											setOpenNotice(true);
										}
									}}>Create New Profile</Button>
								</Grid>
								<Grid item xs={9}>
									<TextField id="Profile Update fee tf" sx={{ width: "100%" }} variant="filled" type="number" label="Profile Update Fee (mojo)" value={fee} onChange={(e) => {
										const regex = /^[0-9\b]+$/;
										if (e.target.value === "" || regex.test(e.target.value)) {
											setFee(Number(e.target.value));
										}
									}} />
								</Grid>
								<Grid item xs={3}>
									<IconButton size="small" aria-label="info" onClick={() => {
										setNoticeTitle("Profile Update Fee");
										setNoticeMessage(`Creating or updating a profile requires a blockchain transaction. This optional fee can help speed up that transaction if volume is high.`);
										setOpenNotice(true);
									}}><InfoIcon /></IconButton>
								</Grid>
							</Grid>
						</Paper>
						<Paper sx={{ p: 2 }}>
							<Grid container spacing={4}>
								<Grid item xs={9}>
									<Button variant="contained" sx={{ width: "100%" }} onClick={async () => {
										window.open("https://testnet11-faucet.chia.net/", "_blank");
									}}>Request Funds</Button>
								</Grid>
								<Grid item xs={3}>
									<IconButton size="small" aria-label="info" onClick={() => {
										setNoticeTitle("Faucet");
										setNoticeMessage("Some operations (such as creating a profile) require a very small amount of XCH to complete. If your wallet is new, or empty, you can request a small amount to get started.");
										setOpenNotice(true);
									}}><InfoIcon /></IconButton>
								</Grid>
							</Grid>
						</Paper>
					</Stack>
				</Grid>
				<Grid item xs={9}>
					{!session?.acknowledged && <Typography variant="h6" component="h2" sx={{ margin: 5 }}>Connect to your wallet to see your profiles</Typography>}
					{session && !loaded && <CircularProgress sx={{ margin: 5 }} />}
					{session && loaded && profiles.length <= 0 && <Typography variant="h6" component="h2" sx={{ margin: 5 }}>No profiles found</Typography>}
					{session && loaded && profiles.map((profile) => (
						<Paper key={profile.did} sx={{ p: 2, margin: 2 }}>
							<Grid container>
								<Grid item xs={10}>
									<Grid container>
										<Grid item xs={12}>
											<Typography variant="h6" component="h2">
												{profile.name} <Chip size="small" label={gostiConfig.identity.activeDID === profile.did ? "Active" : "Activate"} color={gostiConfig.identity.activeDID === profile.did ? "primary" : "default"}
													onClick={async () => {
														gostiConfig.identity.activeDID = profile.did;
														gostiConfig.identity.currentNostrPublicKey = profile.metadata.gostiActiveNostrPublicKey || "";
														const resp2 = await signMessageById({ id: profile.did, message: gostiConfig.identity.currentNostrPublicKey } as SignMessageByIdRequest);
														gostiConfig.identity.proof = resp2.signature;
														await setGostiConfig({ ...gostiConfig });
													}} />
											</Typography>
											<Typography variant="body2" component="p">
												{profile.did.slice(0, 13)}...{profile.did.slice(64, profile.did.length)} <IconButton size="small" aria-label="info" onClick={() => {
													navigator.clipboard.writeText(profile.did);
												}}><ContentCopyIcon /></IconButton>
											</Typography>
										</Grid>
										<Grid item xs={4}>
											<Paper sx={{ p: 1, maxHeight: "256px" }}>
												<img src={profile.metadata.gostiAvatar} style={{ maxWidth: "-webkit-fill-available", maxHeight: "-webkit-fill-available" }} alt="avatar" />
											</Paper>
										</Grid>
										<Grid item xs={4}>
											<Typography variant="h6" component="p">
												{profile.metadata.gostiDisplayName}
											</Typography>
											<Typography variant="body2" component="p">
												{profile.metadata.gostiBio}
											</Typography>
										</Grid>
										<Grid item xs={4}>
											{JSON.parse(profile.metadata.gostiLinks || "[]").map((link: SocialLink) => <Button key={link.name} href={link.link} target='_blank' component='a'>{link.name}</Button>)}
										</Grid>

									</Grid>
								</Grid>
								<Grid item xs={1}>
									{profile.coinAvailable ? "" : <Box>
										Update in Progress...
										<IconButton
											size="small"
											edge="end"
											aria-label=""
											aria-haspopup="true"
											color="inherit"
											onClick={
												async () => {
													// const result = await deleteUnconfirmedTransactions({ amount: 1, backupDids: [], numOfBackupIdsNeeded: 1, fee } as CreateNewDIDWalletRequest);
												}
											}
										>
											<Box sx={{ m: 1, position: 'relative' }}>
												<CloseIcon />
												<CircularProgress sx={{
													position: 'absolute',
													marginTop: '-8px',
													left: '-8px'
												}}
												/>
											</Box>
										</IconButton>
									</Box>}
								</Grid>
								<Grid item xs={1}>
									<Button variant="contained" sx={{ width: "100%" }} onClick={() => {
										setActiveProfile(profile);
										setOpen(true);
									}}><EditIcon /></Button>
								</Grid>
							</Grid>
						</Paper>
					))}
					{ProfileEditPage({ profile: activeProfile, onUpdateMetadata, onChangeName, open, setOpen } as ProfileEditPageProps)}
					<Modal
						open={openNotice}
						onClose={() => { setOpenNotice(false); }}
						aria-labelledby="modal-modal-title"
						aria-describedby="modal-modal-description"
					>
						<Box sx={infoModalStyle}>
							<Typography id="modal-modal-title" variant="h6" component="h2">
								{noticeTitle}
							</Typography>
							<Typography id="modal-modal-description" sx={{ mt: 2 }}>
								{noticeMessage}
							</Typography>
						</Box>
					</Modal>
				</Grid>
			</Grid>
		</Box >
	);
};

