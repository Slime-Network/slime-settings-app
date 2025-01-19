import MenuIcon from '@mui/icons-material/Menu';
import RefreshIcon from '@mui/icons-material/Refresh';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { SessionTypes } from '@walletconnect/types';
import React from 'react';

import WalletConnectMenu from '../slime-shared/components/WalletConnectMenu';
import ThemeSwitcher from './ThemeSwitcher';

export const MainTopBar = (
	session: SessionTypes.Struct | undefined,
	connectToWallet: () => void,
	disconnectFromWallet: () => void
) => {
	const [anchor2El, setAnchor2El] = React.useState<null | HTMLElement>(null);
	const isMainMenuOpen = Boolean(anchor2El);

	const handleClick2 = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchor2El(event.currentTarget);
	};
	const handleClose2 = () => {
		setAnchor2El(null);
	};

	const mainMenuId = 'primary-search-main';
	const renderMainMenu = (
		<Menu
			anchorEl={anchor2El}
			anchorOrigin={{
				vertical: 'top',
				horizontal: 'right',
			}}
			id={mainMenuId}
			keepMounted
			transformOrigin={{
				vertical: 'top',
				horizontal: 'right',
			}}
			open={isMainMenuOpen}
			onClose={handleClose2}
		>
			<ThemeSwitcher />
		</Menu>
	);

	return (
		<Box sx={{ flexGrow: 1 }}>
			<AppBar position="static">
				<Toolbar>
					<IconButton
						size="large"
						edge="start"
						color="inherit"
						aria-label="open drawer"
						aria-haspopup="true"
						sx={{ mr: 2 }}
						onClick={handleClick2}
					>
						<MenuIcon />
					</IconButton>
					<Typography variant="h6" noWrap component="div" sx={{ display: { xs: 'none', sm: 'block' } }}>
						Settings
					</Typography>
					<Box sx={{ flexGrow: 1 }} />
					<IconButton
						size="large"
						edge="end"
						aria-label=""
						aria-haspopup="true"
						color="inherit"
						onClick={() => window.location.reload()}
					>
						<RefreshIcon />
					</IconButton>
					<Box sx={{ display: { xs: 'flex' } }}>{WalletConnectMenu(session, connectToWallet, disconnectFromWallet)}</Box>
				</Toolbar>
			</AppBar>
			{renderMainMenu}
		</Box>
	);
};
