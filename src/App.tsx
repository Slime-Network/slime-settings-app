import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Button,
	Chip,
	CircularProgress,
	Fab,
	Grid,
	IconButton,
	Modal,
	Paper,
	Stack,
	TextField,
	Tooltip,
	Typography,
} from '@mui/material';
import React from 'react';

import { MainTopBar } from './components/MainTopBar';
import { AddMarketplaceModal } from './gosti-shared/components/AddMarketplaceModal';
import { AddRelayModal } from './gosti-shared/components/AddRelayModal';
import { FeeDialogModal } from './gosti-shared/components/FeeDialogModal';
import { ProfileEditPage } from './gosti-shared/components/ProfileEditPage';
import { XchDisplay } from './gosti-shared/components/XchDisplay';
import { infoModalStyle } from './gosti-shared/constants';
import { SocialLink } from './gosti-shared/constants/social-links';
import { useGostiApi } from './gosti-shared/contexts/GostiApiContext';
import { useWalletConnect } from './gosti-shared/contexts/WalletConnectContext';
import { useWalletConnectRpc } from './gosti-shared/contexts/WalletConnectRpcContext';
import { Identity } from './gosti-shared/types/gosti/GostiRpcTypes';
import { Profile } from './gosti-shared/types/gosti/Profile';
import { WalletType } from './gosti-shared/types/walletconnect/WalletType';
import { CreateNewDIDWalletRequest } from './gosti-shared/types/walletconnect/rpc/CreateNewDIDWallet';
import { FindLostDIDResponse } from './gosti-shared/types/walletconnect/rpc/FindLostDID';
import { GetDIDRequest, GetDIDResponse } from './gosti-shared/types/walletconnect/rpc/GetDID';
import { GetDIDInfoRequest, GetDIDInfoResponse } from './gosti-shared/types/walletconnect/rpc/GetDIDInfo';
import { GetWalletBalanceResponse } from './gosti-shared/types/walletconnect/rpc/GetWalletBalance';
import { GetWalletsRequest, GetWalletsResponse } from './gosti-shared/types/walletconnect/rpc/GetWallets';
import { SetDIDNameRequest } from './gosti-shared/types/walletconnect/rpc/SetDIDName';
import {
	UpdateDIDMetadataRequest,
	UpdateDIDMetadataResponse,
} from './gosti-shared/types/walletconnect/rpc/UpdateDIDMetadata';

export const App = () => {
	const {
		getWallets,
		getDID,
		getDIDInfo,
		// findLostDID,
		updateDIDMetadata,
		setDIDName,
		createNewDIDWallet,
		getWalletBalance,
	} = useWalletConnectRpc();

	const { client, session, pairings, connect, disconnect } = useWalletConnect();

	const { gostiConfig, setGostiConfig } = useGostiApi();

	const [profiles, setProfiles] = React.useState<Profile[]>([]);
	const [activeProfile, setActiveProfile] = React.useState<Profile | undefined>(undefined);
	const [loaded, setLoaded] = React.useState<boolean>(false);

	const [balance, setBalance] = React.useState<number>(0);
	const [spendableBalance, setSpendableBalance] = React.useState<number>(0);

	const [open, setOpen] = React.useState(false);

	const [openNotice, setOpenNotice] = React.useState(false);
	const [noticeTitle, setNoticeTitle] = React.useState<string | undefined>(undefined);
	const [noticeMessage, setNoticeMessage] = React.useState<string | undefined>(undefined);

	const [feeDialogOpen, setFeeDialogOpen] = React.useState(false);
	const [feeDialogMessageBefore, setFeeDialogMessageBefore] = React.useState('');
	const [feeDialogMessageSuccess, setFeeDialogMessageSuccess] = React.useState('');
	const [feeDialogMessageFailure, setFeeDialogMessageFailure] = React.useState('');
	const [feeDialogAction, setFeeDialogAction] = React.useState<() => Promise<void>>(async () => {});
	const [fee, setFee] = React.useState<number>(500);

	const [addMarketplaceModalOpen, setAddMarketplaceModalOpen] = React.useState(false);
	const [addRelayModalOpen, setAddRelayModalOpen] = React.useState(false);

	React.useEffect(() => {
		const getProfiles = async () => {
			if (profiles.length > 0) return;
			const getWalletsResult: GetWalletsResponse = await getWallets({ includeData: false } as GetWalletsRequest);
			const profs = [] as Profile[];
			// eslint-disable-next-line no-restricted-syntax -- Because
			for (const wallet of getWalletsResult) {
				if (wallet.type === WalletType.DecentralizedId) {
					console.log('wallet', wallet);
					// eslint-disable-next-line no-await-in-loop -- Because
					const did: GetDIDResponse = await getDID({ walletId: wallet.id } as GetDIDRequest).catch((e) => {
						console.log('getDID error', e);
						return { myDid: '', coinId: '' } as GetDIDResponse;
					});
					if (!did.coinId) {
						// const foundDID: FindLostDIDResponse = await findLostDID({ coinId: did.myDid } as FindLostDIDRequest);
						const foundDID = { success: false } as FindLostDIDResponse;
						if (!foundDID.success) {
							console.log(`no coin id for ${did.myDid} found`);
						}
					}
					// eslint-disable-next-line no-await-in-loop -- Because
					const info: GetDIDInfoResponse = await getDIDInfo({ coinId: did.myDid } as GetDIDInfoRequest).catch((e) => {
						console.log('error', e);
						return { success: false, p2_address: '', metadata: {} } as GetDIDInfoResponse;
					});

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
						console.log('profile', p);
					} else {
						console.log('error', info);
					}
				} else if (wallet.type === WalletType.StandardWallet) {
					// eslint-disable-next-line no-await-in-loop -- Because
					const balanceResp: GetWalletBalanceResponse = await getWalletBalance({
						walletId: wallet.id,
					} as GetWalletBalanceResponse);
					console.log('balanceResp', balanceResp);
					setBalance(Number(balanceResp.pendingTotalBalance));
					setSpendableBalance(Number(balanceResp.spendableBalance));
				}
			}
			setLoaded(true);
			setProfiles(profs);

			gostiConfig.identities = profs.map(
				(p) =>
					({
						did: p.did,
						currentNostrPublicKey: p.metadata.gostiActiveNostrPublicKey,
						proof: JSON.parse(profs[0].metadata.gostiNostrPublicKeys || '[]').proof,
					} as Identity)
			);
			setGostiConfig({ ...gostiConfig });
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
		console.log('profiles', profiles);
		setProfiles(profiles);
	}, [profiles]);

	React.useEffect(() => {
		console.log('activeProfile', activeProfile);
		gostiConfig.activeIdentity =
			gostiConfig.identities.find((i) => i.did === activeProfile?.did) || gostiConfig.activeIdentity;
		setGostiConfig({ ...gostiConfig });
		// eslint-disable-next-line react-hooks/exhaustive-deps -- Because
	}, [activeProfile]);

	const onChangeName = async (name: string) => {
		if (!activeProfile) throw new Error('No active profile');
		const resp = await setDIDName({ walletId: activeProfile.walletId, name } as SetDIDNameRequest);
		console.log('resp name', resp);
		setNoticeTitle('Profile Name Updated');
		setNoticeMessage(
			`Your profile name was updated to: ${name} (This may require you to refresh your wallet to see the change.)`
		);
		setOpenNotice(true);
	};

	const onUpdateMetadata = async (metadata: any) => {
		if (!activeProfile) throw new Error('No active profile');
		const resp: UpdateDIDMetadataResponse = await updateDIDMetadata({
			walletId: activeProfile?.walletId,
			metadata,
			fee,
		} as UpdateDIDMetadataRequest);
		if (resp.success) {
			setNoticeTitle('Profile Metadata Updated');
			setNoticeMessage(
				`Your profile metadata was updated. It may take a few minutes for the transaction to be confirmed.`
			);
			setOpenNotice(true);
		} else {
			setNoticeTitle('Profile Metadata Update Failed');
			setNoticeMessage(`Your profile metadata update failed.`);
			setOpenNotice(true);
			console.log('resp error', resp);
		}
	};

	const createNewDID = async () => {
		console.log('createNewDID');
		const result = await createNewDIDWallet({
			amount: 1,
			backupDids: [],
			numOfBackupIdsNeeded: 1,
			fee,
		} as CreateNewDIDWalletRequest);
		if (result.success) {
			setNoticeTitle('Profile Created!');
			setNoticeMessage(`Your profile was created with the following DID: ${result.myDid}`);
			setOpenNotice(true);
		} else {
			setNoticeTitle('Profile Creation Failed');
			setNoticeMessage(`Your profile creation failed. Error: ${(result as any).error}`);
			setOpenNotice(true);
		}
	};

	return (
		<Box>
			{MainTopBar(session, onConnect, disconnect)}

			<Stack direction={'column'} spacing={2}>
				<Accordion defaultExpanded sx={{ padding: '1rem' }}>
					<AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1-content" id="panel1-header">
						<Typography variant="h4">Wallet {session && !loaded ? <CircularProgress /> : ''}</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Paper elevation={3} sx={{ padding: '1rem' }}>
							<Grid container spacing={3}>
								<Grid item xs={12} sm={12} md={6} xl={4}>
									<XchDisplay mojo={balance} label="Balance" />
								</Grid>
								<Grid item xs={12} sm={12} md={6} xl={4}>
									<XchDisplay mojo={spendableBalance} label="Spendable Balance" />
								</Grid>
								<Grid item xs={10} sm={10} md={5} xl={3}>
									<Button
										variant="contained"
										sx={{ width: '100%' }}
										href={'https://testnet11-faucet.chia.net/'}
										target="_blank"
										component="a"
									>
										Request Funds
									</Button>
								</Grid>
								<Grid item xs={2} sm={2} md={1} xl={1}>
									<IconButton
										size="small"
										aria-label="info"
										onClick={() => {
											setNoticeTitle('Faucet');
											setNoticeMessage(
												'Some operations (such as creating a profile) require a very small amount of XCH to complete. If your wallet is new, or empty, you can request a small amount to get started.'
											);
											setOpenNotice(true);
										}}
									>
										<InfoIcon />
									</IconButton>
								</Grid>
							</Grid>
						</Paper>
					</AccordionDetails>
				</Accordion>

				<Accordion defaultExpanded sx={{ padding: '1rem' }}>
					<AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1-content" id="panel1-header">
						<Typography variant="h4">
							Profiles{' '}
							{session && !loaded ? (
								<CircularProgress />
							) : profiles.length > 0 ? (
								''
							) : (
								<Typography variant="body2">'No Profiles Found'</Typography>
							)}
						</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Grid container spacing={3}>
							{session &&
								loaded &&
								profiles.map((profile) => (
									<Grid item xs={12} sm={12} md={6} xl={4}>
										<Paper elevation={3} key={profile.did} sx={{ display: 'flex', height: '300px', padding: '10px' }}>
											<Grid container>
												<Grid item xs={10}>
													<Grid container>
														<Grid item xs={12}>
															<Typography variant="h6">
																{profile.name}
																<Tooltip title="Activate Profile">
																	<Chip
																		size="small"
																		label={gostiConfig.activeIdentity.did === profile.did ? 'Active' : 'Activate'}
																		color={gostiConfig.activeIdentity.did === profile.did ? 'primary' : 'default'}
																		onClick={() => {
																			setActiveProfile(profile);
																		}}
																	/>
																</Tooltip>
															</Typography>
															<Typography variant="body2">
																{profile.did.slice(0, 13)}...{profile.did.slice(64, profile.did.length)}{' '}
																<Tooltip title="Copy">
																	<IconButton
																		size="small"
																		aria-label="info"
																		onClick={() => {
																			navigator.clipboard.writeText(profile.did);
																		}}
																	>
																		<ContentCopyIcon />
																	</IconButton>
																</Tooltip>
															</Typography>
														</Grid>
														<Grid item xs={4}>
															<Box sx={{ p: 1, maxHeight: '225px', aspectRatio: '1/1', overflow: 'hidden' }}>
																<img
																	src={profile.metadata.gostiAvatar}
																	style={{ width: '100%', height: '100%', objectFit: 'cover' }}
																	alt="avatar"
																/>
															</Box>
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
															{JSON.parse(profile.metadata.gostiLinks || '[]').map((link: SocialLink) => (
																<Button key={link.name} href={link.link} target="_blank" component="a">
																	{link.name}
																</Button>
															))}
														</Grid>
													</Grid>
												</Grid>
												<Grid item xs={1}>
													{profile.coinAvailable ? (
														''
													) : (
														<Box>
															Update in Progress...
															<IconButton
																size="small"
																edge="end"
																aria-label=""
																aria-haspopup="true"
																color="inherit"
																onClick={async () => {
																	// const result = await deleteUnconfirmedTransactions({ amount: 1, backupDids: [], numOfBackupIdsNeeded: 1, fee } as CreateNewDIDWalletRequest);
																}}
															>
																<Box sx={{ m: 1, position: 'relative' }}>
																	<CloseIcon />
																	<CircularProgress
																		sx={{
																			position: 'absolute',
																			marginTop: '-8px',
																			left: '-8px',
																		}}
																	/>
																</Box>
															</IconButton>
														</Box>
													)}
												</Grid>
											</Grid>
											<Tooltip title="Edit">
												<Fab
													sx={{ alignSelf: 'flex-end' }}
													color="primary"
													aria-label="edit"
													onClick={() => {
														setActiveProfile(profile);
														setOpen(true);
													}}
												>
													<EditIcon />
												</Fab>
											</Tooltip>
										</Paper>
									</Grid>
								))}
							<Grid item xs={12} sm={12} md={6} xl={4}>
								<Paper elevation={3} sx={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
									<Fab
										color="primary"
										aria-label="add"
										onClick={() => {
											console.log('createNewDIDWallet 1');
											setFeeDialogAction(() => createNewDID);
											console.log('createNewDIDWallet 3');
											setFeeDialogMessageBefore(
												'Creating a new Decentralized ID (DID) profile in your wallet requires an on-chain transaction. You need at least 1 mojo in your wallet to create this new coin. It will fail if your wallet is empty.'
											);
											setFeeDialogMessageFailure('Transaction failed');
											setFeeDialogMessageSuccess('Transaction successful');
											setFeeDialogOpen(true);
										}}
									>
										<AddIcon />
									</Fab>
								</Paper>
							</Grid>
						</Grid>
					</AccordionDetails>
				</Accordion>

				<Accordion defaultExpanded sx={{ padding: '1rem' }}>
					<AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1-content" id="panel1-header">
						<Typography variant="h4">Marketplaces</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Grid container spacing={3}>
							{gostiConfig.marketplaces.map((marketplace) => (
								<Grid item xs={12} sm={12} md={6} xl={4}>
									<Paper
										elevation={3}
										key={marketplace.displayName}
										sx={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
									>
										<Stack>
											<Typography variant="h6">{marketplace.displayName}</Typography>
											<Typography variant="body2">{marketplace.url}</Typography>
										</Stack>
										<Tooltip title="Delete">
											<IconButton
												size="large"
												aria-label="delete"
												onClick={() => {
													gostiConfig.marketplaces = gostiConfig.marketplaces.filter((m) => m.url !== marketplace.url);
													setGostiConfig({ ...gostiConfig });
												}}
											>
												<DeleteForeverIcon />
											</IconButton>
										</Tooltip>
									</Paper>
								</Grid>
							))}
							<Grid item xs={12} sm={12} md={6} xl={4}>
								<Paper elevation={3} sx={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
									<Tooltip title="Add New Marketplace">
										<Fab
											color="primary"
											aria-label="add"
											onClick={() => {
												setAddMarketplaceModalOpen(true);
											}}
										>
											<AddIcon />
										</Fab>
									</Tooltip>
								</Paper>
							</Grid>
						</Grid>
					</AccordionDetails>
				</Accordion>

				<Accordion defaultExpanded sx={{ padding: '1rem' }}>
					<AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1-content" id="panel1-header">
						<Typography variant="h4">Nostr Relays</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Grid container spacing={3}>
							{gostiConfig.nostrRelays.map((nostrRelay) => (
								<Grid item xs={12} sm={12} md={6} xl={4}>
									<Paper
										elevation={3}
										key={nostrRelay.url}
										sx={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
									>
										<Stack>
											<Typography variant="h6">{nostrRelay.displayName}</Typography>
											<Typography variant="body2">{nostrRelay.url}</Typography>
										</Stack>
										<Tooltip title="Delete">
											<IconButton
												size="large"
												aria-label="delete"
												onClick={() => {
													gostiConfig.marketplaces = gostiConfig.marketplaces.filter((m) => m.url !== nostrRelay.url);
													setGostiConfig({ ...gostiConfig });
												}}
											>
												<DeleteForeverIcon />
											</IconButton>
										</Tooltip>
									</Paper>
								</Grid>
							))}
							<Grid item xs={12} sm={12} md={6} xl={4}>
								<Paper elevation={3} sx={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
									<Tooltip title="Add New Relay">
										<Fab
											color="primary"
											aria-label="add"
											onClick={() => {
												setAddMarketplaceModalOpen(true);
											}}
										>
											<AddIcon />
										</Fab>
									</Tooltip>
								</Paper>
							</Grid>
						</Grid>
					</AccordionDetails>
				</Accordion>

				<Accordion defaultExpanded sx={{ padding: '1rem' }}>
					<AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1-content" id="panel1-header">
						<Typography variant="h4">Files</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Grid container spacing={3}>
							<Grid item xs={12} sm={12} md={6} xl={4}>
								<TextField
									id="outlined-basic"
									label="Install Path"
									variant="outlined"
									fullWidth
									value={gostiConfig.installsPath}
									onChange={(e) => {
										gostiConfig.installsPath = e.target.value;
										setGostiConfig({ ...gostiConfig });
									}}
								/>
							</Grid>
							<Grid item xs={12} sm={12} md={6} xl={4}>
								<TextField
									id="outlined-basic"
									label="Data Path"
									variant="outlined"
									fullWidth
									value={gostiConfig.mediaDataPath}
									onChange={(e) => {
										gostiConfig.mediaDataPath = e.target.value;
										setGostiConfig({ ...gostiConfig });
									}}
								/>
							</Grid>
							<Grid item xs={12} sm={12} md={6} xl={4}>
								<TextField
									id="outlined-basic"
									label="Torrents Path"
									variant="outlined"
									fullWidth
									value={gostiConfig.torrentsPath}
									onChange={(e) => {
										gostiConfig.torrentsPath = e.target.value;
										setGostiConfig({ ...gostiConfig });
									}}
								/>
							</Grid>
						</Grid>
					</AccordionDetails>
				</Accordion>
			</Stack>

			<FeeDialogModal
				open={feeDialogOpen}
				setOpen={setFeeDialogOpen}
				fee={fee}
				setFee={setFee}
				action={feeDialogAction}
				messageBefore={feeDialogMessageBefore}
				messageSuccess={feeDialogMessageSuccess}
				messageFailure={feeDialogMessageFailure}
			/>
			<AddMarketplaceModal open={addMarketplaceModalOpen} setOpen={setAddMarketplaceModalOpen} />
			<AddRelayModal open={addRelayModalOpen} setOpen={setAddRelayModalOpen} />
			<ProfileEditPage
				profile={activeProfile}
				onUpdateMetadata={onUpdateMetadata}
				onChangeName={onChangeName}
				open={open}
				setOpen={setOpen}
			/>
			<Modal
				open={openNotice}
				onClose={() => {
					setOpenNotice(false);
				}}
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
		</Box>
	);
};
