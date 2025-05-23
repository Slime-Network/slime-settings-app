import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Autocomplete,
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
import { AddInstallPathModal } from './slime-shared/components/AddInstallPathModal';
import { AddMarketplaceModal } from './slime-shared/components/AddMarketplaceModal';
import { AddRelayModal } from './slime-shared/components/AddRelayModal';
import { AddTorrentPathModal } from './slime-shared/components/AddTorrentPathModal';
import { FeeDialogModal } from './slime-shared/components/FeeDialogModal';
import { infoModalStyle } from './slime-shared/components/InfoModal';
import { MarketplaceDisplay } from './slime-shared/components/MarketplaceDisplay';
import { NostrRelayDisplay } from './slime-shared/components/NostrRelayDisplay';
import { ProfileEditPage } from './slime-shared/components/ProfileEditPage';
import { XchDisplay } from './slime-shared/components/XchDisplay';
import { SocialLink } from './slime-shared/constants/social-links';
import { useSlimeApi } from './slime-shared/contexts/SlimeApiContext';
import { useWalletConnect } from './slime-shared/contexts/WalletConnectContext';
import { useWalletConnectRpc } from './slime-shared/contexts/WalletConnectRpcContext';
import { Identity, Marketplace } from './slime-shared/types/slime/MarketplaceApiTypes';
import { ChiaProfile } from './slime-shared/types/slime/Profile';
import { AddIdentityRequest, RemoveMarketplaceRequest } from './slime-shared/types/slime/SlimeRpcTypes';
import { WalletType } from './slime-shared/types/walletconnect/WalletType';
import { CreateNewDIDWalletRequest } from './slime-shared/types/walletconnect/rpc/CreateNewDIDWallet';
import { FindLostDIDResponse } from './slime-shared/types/walletconnect/rpc/FindLostDID';
import { GetDIDRequest, GetDIDResponse } from './slime-shared/types/walletconnect/rpc/GetDID';
import { GetDIDInfoRequest, GetDIDInfoResponse } from './slime-shared/types/walletconnect/rpc/GetDIDInfo';
import { GetWalletBalanceResponse } from './slime-shared/types/walletconnect/rpc/GetWalletBalance';
import { GetWalletsRequest, GetWalletsResponse } from './slime-shared/types/walletconnect/rpc/GetWallets';
import { RequestPermissionsRequest } from './slime-shared/types/walletconnect/rpc/RequestPermissions';
import { SetDIDNameRequest } from './slime-shared/types/walletconnect/rpc/SetDIDName';
import {
	UpdateDIDMetadataRequest,
	UpdateDIDMetadataResponse,
} from './slime-shared/types/walletconnect/rpc/UpdateDIDMetadata';

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
		requestPermissions,
	} = useWalletConnectRpc();

	const { client, session, pairings, connect, disconnect } = useWalletConnect();

	const {
		slimeConfig,
		nostrRelays,
		marketplaces,
		installPaths,
		torrentPaths,
		identities,
		removeMarketplace,
		removeNostrRelay,
		removeInstallPath,
		removeTorrentPath,
		addIdentity,
		setActiveIdentity,
		setActiveInstallPath,
		setActiveTorrentPath,
		// setActiveMarketplace,
	} = useSlimeApi();

	const [profilesChia, setProfilesChia] = React.useState<ChiaProfile[]>([]);
	const [activeProfile, setActiveProfile] = React.useState<ChiaProfile | undefined>(undefined);
	const [currentIdentity, setCurrentIdentity] = React.useState<Identity | undefined>(undefined);
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
	const [addInstallPathModalOpen, setAddInstallPathModalOpen] = React.useState(false);
	const [addTorrentPathModalOpen, setAddTorrentPathModalOpen] = React.useState(false);

	React.useEffect(() => {
		if (slimeConfig) {
			if (slimeConfig.did) {
				const foundProfile = profilesChia?.find((profile) => profile.did === slimeConfig.did);
				if (foundProfile) {
					setActiveProfile(foundProfile);
				}
				const foundIdentity = identities?.find((identity) => identity.did === slimeConfig.did);
				if (foundIdentity) {
					setCurrentIdentity(foundIdentity);
				}
				console.log('foundProfile', foundProfile);
				console.log('foundIdentity', foundIdentity);
			}
		}
	}, [slimeConfig, profilesChia, identities]);

	React.useEffect(() => {
		const getProfiles = async () => {
			const permsResp = await requestPermissions({
				commands: ['getWallets', 'getDID', 'getDIDInfo', 'getWalletBalance'],
			} as RequestPermissionsRequest);
			console.log('permsResp', permsResp);
			if (profilesChia.length > 0) return;
			const getWalletsResult: GetWalletsResponse = await getWallets({ includeData: false } as GetWalletsRequest);
			const profs = [] as ChiaProfile[];
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
						} as ChiaProfile;
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
			setProfilesChia(profs);
		};
		document.title = `Your Profiles`;
		if (session?.acknowledged && !profilesChia.length && profilesChia.length <= 0) {
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
		console.log('profilesChia', profilesChia);
		profilesChia.forEach(async (profile) => {
			const foundProfile = identities?.find((identity) => identity.did === profile.did);
			if (!foundProfile) {
				console.log('Adding identity', profile);
				const response = await addIdentity({
					did: profile.did,
					activeProof: JSON.parse(profile.metadata.slimeActiveProof || '{}'),
					displayName: profile.metadata.slimeDisplayName || profile.did,
					avatar: profile.metadata.slimeAvatar || '',
					bio: profile.metadata.slimeBio || '',
					location: profile.metadata.slimeLocation || '',
					languages: JSON.parse(profile.metadata.slimeLanguages || '[]'),
					links: JSON.parse(profile.metadata.slimeLinks || '[]'),
					proofs: JSON.parse(profile.metadata.slimeProofs || '[]'),
				} as AddIdentityRequest);
				console.log('addIdentity response', response);
			}
		});
	}, [addIdentity, identities, profilesChia]);

	const onChangeName = async (name: string) => {
		if (!activeProfile) throw new Error('No active profile');
		const resp = await setDIDName({ walletId: activeProfile.walletId, name } as SetDIDNameRequest);
		console.log('resp name', resp);
		if (!resp.success) {
			setNoticeTitle('Profile Name Update Failed');
			setNoticeMessage(`Your profile name update failed.`);
			setOpenNotice(true);
			return;
		}
		setNoticeTitle('Profile Name Updated');
		setNoticeMessage(
			`Your profile name was updated to: ${name} (This may require you to refresh your wallet to see the change.)`
		);
		setOpenNotice(true);
	};

	const onUpdateMetadata = async (metadata: any) => {
		if (!activeProfile) throw new Error('No active profile');
		if (!slimeConfig) {
			console.log('No slimeConfig found');
			alert('No slimeConfig found. Please set up your profile.');
			return;
		}
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
							) : profilesChia.length > 0 ? (
								''
							) : (
								<Typography variant="body2">'No Profiles Found'</Typography>
							)}
						</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Grid container spacing={3}>
							{identities?.map((identity) => (
								<Grid item xs={12} sm={12} md={6} xl={4}>
									<Paper elevation={3} key={identity.did} sx={{ display: 'flex', height: '300px', padding: '10px' }}>
										<Grid container>
											<Grid item xs={10}>
												<Grid container>
													<Grid item xs={12}>
														<Typography variant="h6">
															{identity.displayName}
															<Tooltip title="Activate Identity">
																<Chip
																	size="small"
																	label={slimeConfig?.did === identity.did ? 'Active' : 'Activate'}
																	color={slimeConfig?.did === identity.did ? 'primary' : 'default'}
																	onClick={() => {
																		setCurrentIdentity(identity);
																		setActiveIdentity({ did: identity.did });
																		setActiveProfile(profilesChia.find((profile) => profile.did === identity.did));
																	}}
																/>
															</Tooltip>
														</Typography>
														<Typography variant="body2">
															{identity.did.slice(0, 13)}...{identity.did.slice(64, identity.did.length)}{' '}
															<Tooltip title="Copy">
																<IconButton
																	size="small"
																	aria-label="info"
																	onClick={() => {
																		navigator.clipboard.writeText(identity.did);
																	}}
																>
																	<ContentCopyIcon />
																</IconButton>
															</Tooltip>
														</Typography>
													</Grid>
													<Grid item xs={4}>
														<Box sx={{ p: 1, maxHeight: '225px', aspectRatio: '1/1', overflow: 'hidden' }}>
															<img src={identity.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
														</Box>
													</Grid>
													<Grid item xs={4}>
														<Typography variant="h6" component="p">
															{identity.displayName}
														</Typography>
														<Typography variant="body2" component="p">
															{identity.bio}
														</Typography>
													</Grid>
													<Grid item xs={4}>
														{identity.links &&
															identity.links.map((link: SocialLink) => (
																<Button key={link.name} href={link.link} target="_blank" component="a">
																	{link.name}
																</Button>
															))}
													</Grid>
												</Grid>
											</Grid>
											<Grid item xs={1}>
												{true ? (
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
													setCurrentIdentity(identity);
													setActiveIdentity({ did: identity.did });
													setActiveProfile(profilesChia.find((profile) => profile.did === identity.did));
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
											setFeeDialogAction(() => createNewDID);
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
							{marketplaces?.map((marketplace: Marketplace) => (
								<Grid item xs={12} sm={12} md={6} xl={4}>
									<MarketplaceDisplay
										marketplace={marketplace}
										onDelete={() => {
											console.log('removeMarketplace', marketplace);
											removeMarketplace({ id: marketplace.id } as RemoveMarketplaceRequest);
										}}
									/>
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
							{nostrRelays?.map((nostrRelay) => (
								<Grid item xs={12} sm={12} md={6} xl={4}>
									<NostrRelayDisplay
										relay={nostrRelay}
										onDelete={() => {
											removeNostrRelay({ id: nostrRelay.id });
										}}
									/>
								</Grid>
							))}
							<Grid item xs={12} sm={12} md={6} xl={4}>
								<Paper elevation={3} sx={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
									<Tooltip title="Add New Relay">
										<Fab
											color="primary"
											aria-label="add"
											onClick={() => {
												setAddRelayModalOpen(true);
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
							<Grid item xs={10} sm={10} md={5} xl={3}>
								<Autocomplete
									disablePortal
									disableClearable
									options={installPaths || []}
									value={{ id: 0, displayName: slimeConfig?.installPathDisplayName, path: slimeConfig?.installPath }}
									getOptionLabel={(option) => option.displayName || 'null'}
									isOptionEqualToValue={(option, value) => option.id === value.id}
									renderInput={(params) => <TextField {...params} label="Install Path" />}
									onChange={(event, value) => {
										setActiveInstallPath({ id: value?.id || 0 });
									}}
									renderOption={(props, option) => (
										<li {...props} key={option.id}>
											{option.displayName}
											<DeleteIcon
												sx={{ marginLeft: 'auto' }}
												onClick={(e) => {
													e.stopPropagation();
													console.log('removeInstallPath', option);
													removeInstallPath({ id: option.id });
												}}
											/>
										</li>
									)}
								/>
							</Grid>
							<Grid item xs={2} sm={2} md={1} xl={1}>
								<Tooltip title="Add New Install Path">
									<Fab
										color="primary"
										aria-label="add"
										onClick={() => {
											console.log('addInstallPathModalOpen', installPaths);
											setAddInstallPathModalOpen(true);
										}}
									>
										<AddIcon />
									</Fab>
								</Tooltip>
							</Grid>
							<Grid item xs={10} sm={10} md={5} xl={3}>
								<Autocomplete
									disablePortal
									disableClearable
									options={torrentPaths || []}
									value={{ id: 0, displayName: slimeConfig?.torrentPathDisplayName, path: slimeConfig?.torrentPath }}
									renderInput={(params) => <TextField {...params} label="Torrents Path" />}
									renderOption={(props, option) => (
										<li {...props} key={option.id}>
											{option.displayName}
											<DeleteIcon
												sx={{ marginLeft: 'auto' }}
												onClick={(e) => {
													e.stopPropagation();
													console.log('removeTorrentPath', option);
													removeTorrentPath({ id: option.id });
												}}
											/>
										</li>
									)}
									getOptionLabel={(option) => option.displayName || 'null'}
									onChange={(event, value) => {
										setActiveTorrentPath({ id: value?.id || 0 });
									}}
								/>
							</Grid>
							<Grid item xs={2} sm={2} md={1} xl={1}>
								<Tooltip title="Add New Torrent Path">
									<Fab
										color="primary"
										aria-label="add"
										onClick={() => {
											setAddTorrentPathModalOpen(true);
										}}
									>
										<AddIcon />
									</Fab>
								</Tooltip>
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
			<AddInstallPathModal open={addInstallPathModalOpen} setOpen={setAddInstallPathModalOpen} />
			<AddTorrentPathModal open={addTorrentPathModalOpen} setOpen={setAddTorrentPathModalOpen} />
			<ProfileEditPage
				chiaProfile={activeProfile}
				localIdentity={currentIdentity}
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

			{/* <div>
				<code>Chia: {JSON.stringify(activeProfile, null, 2)}</code>
			</div>
			<div>
				<HorizontalRule sx={{ width: '100%' }} />
			</div>
			<code>local: {JSON.stringify(currentIdentity, null, 2)}</code>
			<div>
				<HorizontalRule sx={{ width: '100%' }} />
			</div>
			<div>
				<code>config: {JSON.stringify(slimeConfig, null, 2)}</code>
			</div> */}
		</Box>
	);
};
